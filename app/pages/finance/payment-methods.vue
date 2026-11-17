<script setup lang="ts">
import type { CurrencyRecord, PaymentMethodRecord } from '~/types/finance'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editorOpen = ref(false)
const isSaving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ code: '', name: '', description: '', icon: 'lucide:wallet-cards', active: true, sort_order: 0, currency_ids: [] as number[] })

const { data, status, error: loadError, refresh } = await useAsyncData(
  'finance-payment-methods-admin',
  async () => {
    const [methods, currencies] = await Promise.all([
      api.get<PaymentMethodRecord[]>('/api/v1/payment-methods/manage'),
      api.get<CurrencyRecord[]>('/api/v1/currencies/manage')
    ])
    return { methods, currencies }
  },
  { default: () => ({ methods: [], currencies: [] }) }
)

const methods = computed(() => data.value.methods)
const currencies = computed(() => data.value.currencies)
const activeCurrencies = computed(() => currencies.value.filter(currency => currency.active))
const filteredMethods = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? methods.value.filter(method => `${method.name} ${method.code} ${method.description ?? ''}`.toLowerCase().includes(term)) : methods.value
})
const activeCount = computed(() => methods.value.filter(method => method.active).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingId.value = null
  Object.assign(form, { code: '', name: '', description: '', icon: 'lucide:wallet-cards', active: true, sort_order: methods.value.length * 10 + 10, currency_ids: activeCurrencies.value.map(currency => currency.id) })
  editorOpen.value = true
}
const openEdit = (method: PaymentMethodRecord) => {
  resetMessages(); editingId.value = method.id
  Object.assign(form, { code: method.code, name: method.name, description: method.description ?? '', icon: method.icon ?? 'lucide:wallet-cards', active: method.active, sort_order: method.sort_order, currency_ids: method.currencies.filter(currency => currency.active).map(currency => currency.id) })
  editorOpen.value = true
}
const saveMethod = async () => {
  isSaving.value = true; resetMessages()
  try {
    const payload = { ...form, description: form.description || null, icon: form.icon || null }
    const url = editingId.value ? `/api/v1/payment-methods/${editingId.value}` : '/api/v1/payment-methods'
    await api.mutate(url, editingId.value ? 'PUT' : 'POST', payload)
    editorOpen.value = false
    successMessage.value = `Payment method ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeMethod = async (method: PaymentMethodRecord) => {
  if (!confirm(`Delete ${method.name}?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/payment-methods/${method.id}`, 'DELETE')
    successMessage.value = 'Payment method deleted.'
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Finance" current="Payment methods" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span><button class="btn btn-sm" @click="refresh()">Try again</button></div>
    <div v-if="!activeCurrencies.length && status !== 'pending'" role="alert" class="alert alert-warning mb-5"><Icon name="lucide:circle-alert" /><span>Activate at least one currency before adding a payment method.</span><NuxtLink to="/finance/currencies" class="btn btn-sm">Manage currencies</NuxtLink></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Payment methods"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search payment methods"></label><button class="btn btn-primary whitespace-nowrap" :disabled="!activeCurrencies.length" @click="openCreate"><Icon name="lucide:plus" />Add payment method</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Payment method</th><th>Code</th><th>Supported currencies</th><th>Order</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="method in filteredMethods" :key="method.id">
              <td><div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-primary"><Icon :name="method.icon || 'lucide:wallet-cards'" class="size-5" /></span><div><p class="font-bold">{{ method.name }}</p><p class="max-w-md text-xs leading-5 text-base-content/50">{{ method.description || 'No description' }}</p></div></div></td>
              <td><span class="badge badge-ghost font-mono text-xs">{{ method.code }}</span></td>
              <td><div class="flex flex-wrap gap-1"><span v-for="currency in method.currencies" :key="currency.id" class="badge badge-outline badge-sm">{{ currency.code }}</span></div></td>
              <td>{{ method.sort_order }}</td>
              <td><span :class="['badge badge-sm', method.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ method.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${method.name}`" @click="openEdit(method)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${method.name}`" @click="removeMethod(method)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!loadError && !filteredMethods.length"><td colspan="6" class="py-14 text-center text-base-content/50">{{ search.trim() ? 'No payment methods match this search.' : 'No payment methods configured yet.' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit payment method' : 'Add payment method'" description="A method is only offered where it supports the selected transaction currency." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveMethod">
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Display name</legend><input v-model="form.name" class="input w-full" required placeholder="EcoCash"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">System code</legend><input v-model="form.code" class="input w-full font-mono uppercase" required placeholder="ECOCASH"></fieldset></div>
        <fieldset class="fieldset"><legend class="fieldset-legend">Description</legend><textarea v-model="form.description" class="textarea w-full" rows="3" placeholder="Explain when this payment method is used." /></fieldset>
        <fieldset class="fieldset"><legend class="fieldset-legend">Lucide icon</legend><label class="input flex w-full items-center gap-3"><Icon :name="form.icon || 'lucide:wallet-cards'" class="size-5 text-primary" /><input v-model="form.icon" class="grow font-mono" placeholder="lucide:wallet-cards"></label></fieldset>
        <fieldset class="fieldset"><legend class="fieldset-legend">Supported currencies</legend><div class="grid gap-2 sm:grid-cols-2"><label v-for="currency in activeCurrencies" :key="currency.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 p-3"><input v-model="form.currency_ids" type="checkbox" class="checkbox checkbox-primary checkbox-sm" :value="currency.id"><span class="font-semibold">{{ currency.code }}</span><span class="text-xs text-base-content/50">{{ currency.name }}</span></label></div><p class="label">Select at least one active currency.</p></fieldset>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Available to clients</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></div>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving || !form.currency_ids.length"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save payment method</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
