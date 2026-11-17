<script setup lang="ts">
import type { ShoppingAssistantTypeRecord } from '~/types/shopping-assistant'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ code: '', name: '', description: '', icon: 'lucide:user-round', active: true, can_shop: true, can_deliver: false, uses_personal_funds: true, sort_order: 0 })

const { data: assistantTypes, status, error: loadError, refresh } = await useAsyncData(
  'shopping-assistant-types-admin',
  () => api.get<ShoppingAssistantTypeRecord[]>('/api/v1/shopping-assistant-types/manage'),
  { default: () => [] }
)

const filteredTypes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term
    ? assistantTypes.value.filter(type => `${type.name} ${type.code} ${type.description ?? ''}`.toLowerCase().includes(term))
    : assistantTypes.value
})
const activeCount = computed(() => assistantTypes.value.filter(type => type.active).length)
const coreCount = computed(() => assistantTypes.value.filter(type => type.is_core).length)
const editingType = computed(() => assistantTypes.value.find(type => type.id === editingId.value) ?? null)

watch(() => form.can_shop, (canShop) => {
  if (!canShop) form.uses_personal_funds = false
})

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages()
  editingId.value = null
  Object.assign(form, { code: '', name: '', description: '', icon: 'lucide:user-round', active: true, can_shop: true, can_deliver: false, uses_personal_funds: true, sort_order: assistantTypes.value.length * 10 + 10 })
  editorOpen.value = true
}
const openEdit = (type: ShoppingAssistantTypeRecord) => {
  resetMessages()
  editingId.value = type.id
  Object.assign(form, { code: type.code, name: type.name, description: type.description ?? '', icon: type.icon ?? 'lucide:user-round', active: type.active, can_shop: type.can_shop, can_deliver: type.can_deliver, uses_personal_funds: type.uses_personal_funds, sort_order: type.sort_order })
  editorOpen.value = true
}
const saveType = async () => {
  isSaving.value = true
  resetMessages()
  try {
    const payload = { ...form, description: form.description || null, icon: form.icon || null }
    const url = editingId.value ? `/api/v1/shopping-assistant-types/${editingId.value}` : '/api/v1/shopping-assistant-types'
    await api.mutate(url, editingId.value ? 'PUT' : 'POST', payload)
    editorOpen.value = false
    successMessage.value = `Shopping assistant type ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) {
    errorMessage.value = configurationErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}
const removeType = async (type: ShoppingAssistantTypeRecord) => {
  if (!confirm(`Delete the ${type.name} shopping assistant type?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/shopping-assistant-types/${type.id}`, 'DELETE')
    successMessage.value = 'Shopping assistant type deleted.'
    await refresh()
  } catch (error) {
    errorMessage.value = configurationErrorMessage(error)
  }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="BuyForMe" current="Shopping assistant types" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span><button class="btn btn-sm" @click="refresh()">Try again</button></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Shopping assistant types">
        <template #action>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search assistant types"></label>
            <button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />New custom type</button>
          </div>
        </template>
      </ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Assistant type</th><th>Code</th><th>Capabilities</th><th>Funding</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="type in filteredTypes" :key="type.id">
              <td><div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-primary"><Icon :name="type.icon || 'lucide:user-round'" class="size-5" /></span><div><p class="font-bold">{{ type.name }}</p><p class="max-w-xl text-xs leading-5 text-base-content/50">{{ type.description || 'No description' }}</p></div></div></td>
              <td><div class="flex flex-col items-start gap-1"><span class="badge badge-ghost font-mono text-xs">{{ type.code }}</span><span v-if="type.is_core" class="badge badge-warning badge-soft badge-xs">Core</span></div></td>
              <td><div class="flex flex-wrap gap-1"><span v-if="type.can_shop" class="badge badge-primary badge-soft badge-sm">Shopping</span><span v-if="type.can_deliver" class="badge badge-secondary badge-soft badge-sm">Delivery</span></div></td>
              <td><span :class="['badge badge-sm', type.uses_personal_funds ? 'badge-info badge-soft' : 'badge-ghost']">{{ type.uses_personal_funds ? 'Personal funds' : 'No purchase funds' }}</span></td>
              <td><span :class="['badge badge-sm', type.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ type.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${type.name}`" @click="openEdit(type)"><Icon name="lucide:pencil" /></button><div v-if="type.is_core" class="tooltip tooltip-left" data-tip="Core types cannot be deleted"><button class="btn btn-ghost btn-sm btn-square" disabled aria-label="Core type cannot be deleted"><Icon name="lucide:lock-keyhole" /></button></div><button v-else class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${type.name}`" @click="removeType(type)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!loadError && !filteredTypes.length"><td colspan="6" class="py-14 text-center text-base-content/50">{{ search.trim() ? 'No shopping assistant types match this search.' : 'No shopping assistant types configured yet.' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit shopping assistant type' : 'Create custom shopping assistant type'" :description="editingType?.is_core ? 'This core role has protected system capabilities.' : 'Choose whether assistants in this type can shop, deliver, or do both.'" @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveType">
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Display name</legend><input v-model="form.name" class="input w-full" required placeholder="General shopper"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">System code</legend><input v-model="form.code" class="input w-full font-mono uppercase" :disabled="editingType?.is_core" required placeholder="GENERAL_SHOPPER"><p v-if="editingType?.is_core" class="label">Protected for assignment and settlement</p></fieldset></div>
        <fieldset class="fieldset"><legend class="fieldset-legend">Description</legend><textarea v-model="form.description" class="textarea w-full" rows="3" placeholder="Describe the assistants who belong in this type." /></fieldset>
        <fieldset class="fieldset"><legend class="fieldset-legend">Lucide icon</legend><label class="input flex w-full items-center gap-3"><Icon :name="form.icon || 'lucide:user-round'" class="size-5 text-primary" /><input v-model="form.icon" class="grow font-mono" placeholder="lucide:user-round"></label><p class="label">Use an icon name such as lucide:user-round or lucide:badge-check.</p></fieldset>
        <fieldset class="fieldset"><legend class="fieldset-legend">Operational capabilities</legend><div class="grid gap-3 sm:grid-cols-3"><label class="flex items-center justify-between rounded-field border border-base-300 px-4 py-3"><span class="text-sm font-semibold">Shopping</span><input v-model="form.can_shop" type="checkbox" class="toggle toggle-primary" :disabled="editingType?.is_core"></label><label class="flex items-center justify-between rounded-field border border-base-300 px-4 py-3"><span class="text-sm font-semibold">Delivery</span><input v-model="form.can_deliver" type="checkbox" class="toggle toggle-secondary" :disabled="editingType?.is_core"></label><label class="flex items-center justify-between rounded-field border border-base-300 px-4 py-3"><span class="text-sm font-semibold">Uses personal funds</span><input v-model="form.uses_personal_funds" type="checkbox" class="toggle toggle-info" :disabled="editingType?.is_core || !form.can_shop"></label></div><p class="label">At least one of Shopping or Delivery is required. Personal funds can only be enabled for shopping roles.</p></fieldset>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Available for use</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></div>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />{{ editingId ? 'Update assistant type' : 'Create assistant type' }}</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
