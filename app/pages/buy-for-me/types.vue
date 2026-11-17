<script setup lang="ts">
import type { BuyForMeTypeRecord } from '~/types/coverage'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const editorOpen = ref(false)
const editingType = ref<BuyForMeTypeRecord | null>(null)
const form = reactive({ code: '', name: '', description: '', active: true, sort_order: 0 })

const { data: types, status, refresh } = await useAsyncData(
  'buy-for-me-types-admin',
  () => api.get<BuyForMeTypeRecord[]>('/api/v1/buy-for-me-types/manage'),
  { default: () => [] }
)
const filteredTypes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? types.value.filter(type => `${type.name} ${type.code} ${type.description ?? ''}`.toLowerCase().includes(term)) : types.value
})
const coreCount = computed(() => types.value.filter(type => type.is_core).length)
const activeCount = computed(() => types.value.filter(type => type.active).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingType.value = null
  Object.assign(form, { code: '', name: '', description: '', active: true, sort_order: types.value.length * 10 + 10 })
  editorOpen.value = true
}
const openEdit = (type: BuyForMeTypeRecord) => {
  resetMessages(); editingType.value = type
  Object.assign(form, { code: type.code, name: type.name, description: type.description ?? '', active: type.active, sort_order: type.sort_order })
  editorOpen.value = true
}
const saveType = async () => {
  isSaving.value = true; resetMessages()
  try {
    const payload = { ...form, description: form.description || null }
    const url = editingType.value ? `/api/v1/buy-for-me-types/${editingType.value.id}` : '/api/v1/buy-for-me-types'
    await api.mutate(url, editingType.value ? 'PUT' : 'POST', payload)
    editorOpen.value = false
    successMessage.value = `Request type ${editingType.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeType = async (type: BuyForMeTypeRecord) => {
  if (!confirm(`Delete ${type.name}?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/buy-for-me-types/${type.id}`, 'DELETE')
    successMessage.value = 'Request type deleted.'; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="BuyForMe" current="Request types" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Request types"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search request types"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />New custom type</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Request type</th><th>Code</th><th>Kind</th><th>Order</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="type in filteredTypes" :key="type.id">
              <td><div class="flex items-start gap-3"><span :class="['mt-0.5 grid size-9 shrink-0 place-items-center rounded-field', type.is_core ? 'bg-secondary text-secondary-content' : 'bg-base-200 text-base-content/60']"><Icon :name="type.is_core ? 'lucide:route' : 'lucide:tag'" class="size-4" /></span><div><p class="font-bold">{{ type.name }}</p><p class="max-w-lg text-xs leading-5 text-base-content/50">{{ type.description || 'No description' }}</p></div></div></td>
              <td><span class="badge badge-ghost font-mono text-xs">{{ type.code }}</span></td>
              <td><span :class="['badge badge-sm', type.is_core ? 'badge-warning badge-soft' : 'badge-ghost']">{{ type.is_core ? 'Core' : 'Custom' }}</span></td>
              <td>{{ type.sort_order }}</td>
              <td><span :class="['badge badge-sm', type.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ type.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${type.name}`" @click="openEdit(type)"><Icon name="lucide:pencil" /></button><div v-if="type.is_core" class="tooltip tooltip-left" data-tip="Core types cannot be deleted"><button class="btn btn-ghost btn-sm btn-square" disabled aria-label="Core type cannot be deleted"><Icon name="lucide:lock-keyhole" /></button></div><button v-else class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${type.name}`" @click="removeType(type)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!filteredTypes.length"><td colspan="6" class="py-14 text-center text-base-content/50">No request types match this search.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingType ? 'Edit request type' : 'Create custom request type'" :description="editingType?.is_core ? 'The system code is protected because route classification depends on it.' : 'Custom types are available for future workflows but are not selected by automatic geography classification.'" @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveType">
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Display name</legend><input v-model="form.name" class="input w-full" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">System code</legend><input v-model="form.code" class="input w-full font-mono uppercase" :disabled="editingType?.is_core" required placeholder="REGIONAL_EXPRESS"><p v-if="editingType?.is_core" class="label">Protected for automatic routing</p></fieldset></div>
        <fieldset class="fieldset"><legend class="fieldset-legend">Description</legend><textarea v-model="form.description" class="textarea w-full" rows="3" placeholder="Explain when operators should use this type." /></fieldset>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Available to clients</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></div>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save request type</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
