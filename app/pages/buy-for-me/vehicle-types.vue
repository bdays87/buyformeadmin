<script setup lang="ts">
import type { VehicleTypeRecord } from '~/types/delivery'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editorOpen = ref(false)
const isSaving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ name: '', icon: 'lucide:car-front', active: true, sort_order: 0 })

const { data: vehicleTypes, status, error: loadError, refresh } = await useAsyncData(
  'vehicle-types-admin',
  () => api.get<VehicleTypeRecord[]>('/api/v1/vehicle-types/manage'),
  { default: () => [] }
)

const filteredVehicleTypes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? vehicleTypes.value.filter(type => type.name.toLowerCase().includes(term)) : vehicleTypes.value
})
const activeCount = computed(() => vehicleTypes.value.filter(type => type.active).length)
const pricedCount = computed(() => vehicleTypes.value.filter(type => (type.delivery_rates_count ?? 0) > 0).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingId.value = null
  Object.assign(form, { name: '', icon: 'lucide:car-front', active: true, sort_order: vehicleTypes.value.length * 10 + 10 })
  editorOpen.value = true
}
const openEdit = (vehicleType: VehicleTypeRecord) => {
  resetMessages(); editingId.value = vehicleType.id
  Object.assign(form, { name: vehicleType.name, icon: vehicleType.icon, active: vehicleType.active, sort_order: vehicleType.sort_order })
  editorOpen.value = true
}
const saveVehicleType = async () => {
  isSaving.value = true; resetMessages()
  try {
    const url = editingId.value ? `/api/v1/vehicle-types/${editingId.value}` : '/api/v1/vehicle-types'
    await api.mutate(url, editingId.value ? 'PUT' : 'POST', { ...form })
    editorOpen.value = false
    successMessage.value = `Vehicle type ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeVehicleType = async (vehicleType: VehicleTypeRecord) => {
  if (!confirm(`Delete ${vehicleType.name}? Vehicle types with delivery rates cannot be deleted.`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/vehicle-types/${vehicleType.id}`, 'DELETE')
    successMessage.value = 'Vehicle type deleted.'
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="BuyForMe" current="Vehicle types" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span><button class="btn btn-sm" @click="refresh()">Try again</button></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Vehicle types"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search vehicle types"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />Add vehicle type</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Vehicle type</th><th>Delivery rates</th><th>Order</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="vehicleType in filteredVehicleTypes" :key="vehicleType.id">
              <td><div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-field bg-base-200 text-primary"><Icon :name="vehicleType.icon || 'lucide:car-front'" class="size-5" /></span><div><p class="font-bold">{{ vehicleType.name }}</p><p class="text-xs text-base-content/45">{{ vehicleType.icon }}</p></div></div></td>
              <td><NuxtLink v-if="vehicleType.delivery_rates_count" :to="`/buy-for-me/delivery-rates?vehicle_type_id=${vehicleType.id}`" class="btn btn-ghost btn-sm"><span class="badge badge-neutral badge-sm">{{ vehicleType.delivery_rates_count }}</span>View rates</NuxtLink><span v-else class="text-sm text-base-content/45">Not priced</span></td>
              <td>{{ vehicleType.sort_order }}</td>
              <td><span :class="['badge badge-sm', vehicleType.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ vehicleType.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${vehicleType.name}`" @click="openEdit(vehicleType)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${vehicleType.name}`" @click="removeVehicleType(vehicleType)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!loadError && !filteredVehicleTypes.length"><td colspan="5" class="py-14 text-center text-base-content/50">{{ search.trim() ? 'No vehicle types match this search.' : 'No vehicle types configured yet.' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit vehicle type' : 'Add vehicle type'" description="Use a customer-friendly vehicle name. Mileage bands and prices are configured separately." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveVehicleType">
        <fieldset class="fieldset"><legend class="fieldset-legend">Vehicle name</legend><input v-model="form.name" class="input w-full" required maxlength="120" placeholder="Motorbike"></fieldset>
        <fieldset class="fieldset"><legend class="fieldset-legend">Lucide icon</legend><label class="input flex w-full items-center gap-3"><Icon :name="form.icon || 'lucide:car-front'" class="size-5 text-primary" /><input v-model="form.icon" class="grow font-mono" required maxlength="120" placeholder="lucide:car-front"></label><p class="label">Use an icon name such as lucide:bike, lucide:car-front, or lucide:truck.</p></fieldset>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0" max="65535"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Available for rate setup</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></div>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save vehicle type</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
