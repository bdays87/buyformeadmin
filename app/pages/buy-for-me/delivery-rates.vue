<script setup lang="ts">
import type { DeliveryRateRecord, VehicleTypeRecord } from '~/types/delivery'
import type { CurrencyRecord } from '~/types/finance'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const route = useRoute()
const api = useConfigurationApi()
const search = ref('')
const vehicleFilter = ref<number | null>(Number(route.query.vehicle_type_id) || null)
const currencyFilter = ref<number | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const editorOpen = ref(false)
const isSaving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<{
  vehicle_type_id: number | null
  lower_mileage: number
  upper_mileage: number | null
  currency_id: number | null
  amount: number
  active: boolean
  sort_order: number
}>({ vehicle_type_id: null, lower_mileage: 0, upper_mileage: null, currency_id: null, amount: 0, active: true, sort_order: 0 })

const { data: pageData, status, error: loadError, refresh } = await useAsyncData(
  'delivery-rates-admin',
  async () => {
    const [rates, vehicleTypes, currencies] = await Promise.all([
      api.get<DeliveryRateRecord[]>('/api/v1/delivery-rates/manage'),
      api.get<VehicleTypeRecord[]>('/api/v1/vehicle-types'),
      api.get<CurrencyRecord[]>('/api/v1/currencies')
    ])
    return { rates, vehicleTypes, currencies }
  },
  { default: () => ({ rates: [], vehicleTypes: [], currencies: [] }) }
)

const rates = computed(() => pageData.value.rates)
const vehicleTypes = computed(() => pageData.value.vehicleTypes)
const currencies = computed(() => pageData.value.currencies)
const filteredRates = computed(() => {
  const term = search.value.trim().toLowerCase()
  return rates.value.filter((rate) => {
    const matchesSearch = !term || `${rate.vehicle_type.name} ${rate.currency.code} ${rate.amount}`.toLowerCase().includes(term)
    const matchesVehicle = !vehicleFilter.value || rate.vehicle_type_id === vehicleFilter.value
    const matchesCurrency = !currencyFilter.value || rate.currency_id === currencyFilter.value
    return matchesSearch && matchesVehicle && matchesCurrency
  })
})
const activeCount = computed(() => rates.value.filter(rate => rate.active).length)
const openEndedCount = computed(() => rates.value.filter(rate => rate.upper_mileage === null).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingId.value = null
  Object.assign(form, {
    vehicle_type_id: vehicleFilter.value ?? vehicleTypes.value[0]?.id ?? null,
    lower_mileage: 0,
    upper_mileage: null,
    currency_id: currencyFilter.value ?? currencies.value.find(currency => currency.is_default)?.id ?? currencies.value[0]?.id ?? null,
    amount: 0,
    active: true,
    sort_order: rates.value.length * 10 + 10
  })
  editorOpen.value = true
}
const openEdit = (rate: DeliveryRateRecord) => {
  resetMessages(); editingId.value = rate.id
  Object.assign(form, {
    vehicle_type_id: rate.vehicle_type_id,
    lower_mileage: Number(rate.lower_mileage),
    upper_mileage: rate.upper_mileage === null ? null : Number(rate.upper_mileage),
    currency_id: rate.currency_id,
    amount: Number(rate.amount),
    active: rate.active,
    sort_order: rate.sort_order
  })
  editorOpen.value = true
}
const saveRate = async () => {
  isSaving.value = true; resetMessages()
  try {
    const url = editingId.value ? `/api/v1/delivery-rates/${editingId.value}` : '/api/v1/delivery-rates'
    const rawUpperMileage = form.upper_mileage as number | '' | null
    const upperMileage = rawUpperMileage === null || rawUpperMileage === ''
      ? null
      : Number(rawUpperMileage)
    await api.mutate(url, editingId.value ? 'PUT' : 'POST', { ...form, upper_mileage: upperMileage })
    editorOpen.value = false
    successMessage.value = `Delivery rate ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeRate = async (rate: DeliveryRateRecord) => {
  if (!confirm(`Delete the ${bandLabel(rate)} ${rate.vehicle_type.name} rate?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/delivery-rates/${rate.id}`, 'DELETE')
    successMessage.value = 'Delivery rate deleted.'
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
const bandLabel = (rate: DeliveryRateRecord) => rate.upper_mileage === null
  ? `${numberLabel(rate.lower_mileage)} and up`
  : `${numberLabel(rate.lower_mileage)}–${numberLabel(rate.upper_mileage)}`
const numberLabel = (value: string) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
const moneyLabel = (rate: DeliveryRateRecord) => `${rate.currency.symbol}${Number(rate.amount).toLocaleString(undefined, { minimumFractionDigits: rate.currency.decimal_places, maximumFractionDigits: rate.currency.decimal_places })}`
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Finance" current="Delivery rates" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span><button class="btn btn-sm" @click="refresh()">Try again</button></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Delivery rates"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search rates"></label><button class="btn btn-primary whitespace-nowrap" :disabled="!vehicleTypes.length || !currencies.length" @click="openCreate"><Icon name="lucide:plus" />Add delivery rate</button></div></template></ConfigurationCardHeader>
      <div class="grid gap-3 border-b border-base-300 p-4 md:grid-cols-2 md:items-center">
        <select v-model="vehicleFilter" class="select w-full"><option :value="null">All vehicles</option><option v-for="vehicleType in vehicleTypes" :key="vehicleType.id" :value="vehicleType.id">{{ vehicleType.name }}</option></select>
        <select v-model="currencyFilter" class="select w-full"><option :value="null">All currencies</option><option v-for="currency in currencies" :key="currency.id" :value="currency.id">{{ currency.code }}</option></select>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Vehicle</th><th>Mileage band</th><th>Currency</th><th>Rate</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="rate in filteredRates" :key="rate.id">
              <td><div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-field bg-base-200 text-primary"><Icon :name="rate.vehicle_type.icon || 'lucide:car-front'" class="size-5" /></span><div><p class="font-bold">{{ rate.vehicle_type.name }}</p><p class="text-xs text-base-content/45">Order {{ rate.sort_order }}</p></div></div></td>
              <td><div class="min-w-44"><div class="mb-2 flex items-center gap-2"><span class="size-2 rounded-full bg-primary" /><span class="h-px grow bg-base-300" /><Icon name="lucide:map-pin" class="size-4 text-accent" /></div><span class="font-semibold">{{ bandLabel(rate) }}</span></div></td>
              <td><span class="badge badge-ghost font-mono">{{ rate.currency.code }}</span></td>
              <td><span class="text-lg font-black">{{ moneyLabel(rate) }}</span></td>
              <td><span :class="['badge badge-sm', rate.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ rate.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${rate.vehicle_type.name} rate`" @click="openEdit(rate)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${rate.vehicle_type.name} rate`" @click="removeRate(rate)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!loadError && !filteredRates.length"><td colspan="6" class="py-14 text-center text-base-content/50">{{ rates.length ? 'No delivery rates match these filters.' : 'No delivery rates configured yet.' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit delivery rate' : 'Add delivery rate'" description="Rates for the same vehicle and currency may touch, but their mileage bands cannot overlap." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveRate">
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Vehicle type</legend><select v-model="form.vehicle_type_id" class="select w-full" required><option :value="null" disabled>Select vehicle</option><option v-for="vehicleType in vehicleTypes" :key="vehicleType.id" :value="vehicleType.id">{{ vehicleType.name }}</option></select></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Currency</legend><select v-model="form.currency_id" class="select w-full" required><option :value="null" disabled>Select currency</option><option v-for="currency in currencies" :key="currency.id" :value="currency.id">{{ currency.code }} · {{ currency.name }}</option></select></fieldset></div>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Lower mileage</legend><input v-model.number="form.lower_mileage" class="input w-full" type="number" min="0" max="99999999.99" step="0.01" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Upper mileage</legend><input v-model.number="form.upper_mileage" class="input w-full" type="number" min="0" max="99999999.99" step="0.01" placeholder="No upper limit"><p class="label">Leave blank for “and up”</p></fieldset></div>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Amount</legend><input v-model.number="form.amount" class="input w-full" type="number" min="0" max="999999999999.99" step="0.01" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0" max="65535"></fieldset></div>
        <label class="flex items-center justify-between rounded-field border border-base-300 p-4"><span><span class="block text-sm font-semibold">Active rate</span><span class="text-xs text-base-content/45">Available to delivery pricing</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save delivery rate</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
