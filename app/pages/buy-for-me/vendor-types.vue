<script setup lang="ts">
import type { VendorTypeRecord } from '~/types/vendor'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ code: '', name: '', description: '', icon: 'lucide:store', active: true, sort_order: 0 })

const { data: vendorTypes, status, error: loadError, refresh } = await useAsyncData(
  'vendor-types-admin',
  () => api.get<VendorTypeRecord[]>('/api/v1/vendor-types/manage'),
  { default: () => [] }
)
const filteredTypes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term
    ? vendorTypes.value.filter(type => `${type.name} ${type.code} ${type.description ?? ''}`.toLowerCase().includes(term))
    : vendorTypes.value
})
const activeCount = computed(() => vendorTypes.value.filter(type => type.active).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingId.value = null
  Object.assign(form, { code: '', name: '', description: '', icon: 'lucide:store', active: true, sort_order: vendorTypes.value.length * 10 + 10 })
  editorOpen.value = true
}
const openEdit = (type: VendorTypeRecord) => {
  resetMessages(); editingId.value = type.id
  Object.assign(form, { code: type.code, name: type.name, description: type.description ?? '', icon: type.icon ?? 'lucide:store', active: type.active, sort_order: type.sort_order })
  editorOpen.value = true
}
const saveType = async () => {
  isSaving.value = true; resetMessages()
  try {
    const payload = { ...form, description: form.description || null, icon: form.icon || null }
    const url = editingId.value ? `/api/v1/vendor-types/${editingId.value}` : '/api/v1/vendor-types'
    await api.mutate(url, editingId.value ? 'PUT' : 'POST', payload)
    editorOpen.value = false
    successMessage.value = `Vendor type ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeType = async (type: VendorTypeRecord) => {
  if (!confirm(`Delete the ${type.name} vendor type?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/vendor-types/${type.id}`, 'DELETE')
    successMessage.value = 'Vendor type deleted.'; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="BuyForMe" current="Vendor types" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5">
      <Icon name="lucide:triangle-alert" />
      <span>{{ configurationErrorMessage(loadError) }}</span>
      <button class="btn btn-sm" @click="refresh()">Try again</button>
    </div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Vendor types"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search vendor types"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />New vendor type</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Vendor type</th><th>Code</th><th>Icon</th><th>Order</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="type in filteredTypes" :key="type.id">
              <td><div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-primary"><Icon :name="type.icon || 'lucide:store'" class="size-5" /></span><div><p class="font-bold">{{ type.name }}</p><p class="max-w-xl text-xs leading-5 text-base-content/50">{{ type.description || 'No description' }}</p></div></div></td>
              <td><span class="badge badge-ghost font-mono text-xs">{{ type.code }}</span></td>
              <td><span class="text-xs text-base-content/45">{{ type.icon || 'lucide:store' }}</span></td>
              <td>{{ type.sort_order }}</td>
              <td><span :class="['badge badge-sm', type.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ type.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${type.name}`" @click="openEdit(type)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${type.name}`" @click="removeType(type)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!loadError && !filteredTypes.length"><td colspan="6" class="py-14 text-center text-base-content/50">{{ search.trim() ? 'No vendor types match this search.' : 'No vendor types configured yet.' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit vendor type' : 'Create vendor type'" description="Codes are stored in uppercase and will become stable identifiers when vendors are connected." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveType">
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Display name</legend><input v-model="form.name" class="input w-full" required placeholder="Pet supplies"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">System code</legend><input v-model="form.code" class="input w-full font-mono uppercase" required placeholder="PET_SUPPLIES"></fieldset></div>
        <fieldset class="fieldset"><legend class="fieldset-legend">Description</legend><textarea v-model="form.description" class="textarea w-full" rows="3" placeholder="Describe the shops that belong in this type." /></fieldset>
        <fieldset class="fieldset"><legend class="fieldset-legend">Lucide icon</legend><label class="input flex w-full items-center gap-3"><Icon :name="form.icon || 'lucide:store'" class="size-5 text-primary" /><input v-model="form.icon" class="grow font-mono" placeholder="lucide:store"></label><p class="label">Use an icon name such as lucide:store or lucide:shopping-basket.</p></fieldset>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Visible to clients</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></div>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save vendor type</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
