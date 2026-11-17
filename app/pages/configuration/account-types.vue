<script setup lang="ts">
import type { AccountTypeRecord, RoleRecord, SystemModuleRecord } from '~/types/configuration'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const editorOpen = ref(false)
const accessOpen = ref(false)
const editingId = ref<number | null>(null)
const selectedAccountType = ref<AccountTypeRecord | null>(null)
const selectedRoleIds = ref<number[]>([])
const selectedModuleIds = ref<number[]>([])
const form = reactive({ code: '', name: '', description: '', active: true, sort_order: 0 })

const { data, status, refresh } = await useAsyncData('configuration-account-types', async () => {
  const [accountTypes, roles, modules] = await Promise.all([
    api.get<AccountTypeRecord[]>('/api/v1/account-types'),
    api.get<RoleRecord[]>('/api/v1/roles'),
    api.get<SystemModuleRecord[]>('/api/v1/system-modules')
  ])
  return { accountTypes, roles, modules }
})

const accountTypes = computed(() => data.value?.accountTypes ?? [])
const roles = computed(() => data.value?.roles ?? [])
const modules = computed(() => data.value?.modules ?? [])
const filteredAccountTypes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term
    ? accountTypes.value.filter(item => `${item.name} ${item.code} ${item.description ?? ''}`.toLowerCase().includes(term))
    : accountTypes.value
})

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingId.value = null
  Object.assign(form, { code: '', name: '', description: '', active: true, sort_order: accountTypes.value.length * 10 })
  editorOpen.value = true
}
const openEdit = (item: AccountTypeRecord) => {
  resetMessages(); editingId.value = item.id
  Object.assign(form, { code: item.code, name: item.name, description: item.description ?? '', active: item.active, sort_order: item.sort_order })
  editorOpen.value = true
}

const saveAccountType = async () => {
  isSaving.value = true; resetMessages()
  try {
    const payload = { ...form, description: form.description || null }
    if (editingId.value) await api.mutate(`/api/v1/account-types/${editingId.value}`, 'PUT', payload)
    else await api.mutate('/api/v1/account-types', 'POST', payload)
    editorOpen.value = false; successMessage.value = `Account type ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const openAccess = async (item: AccountTypeRecord) => {
  resetMessages(); isSaving.value = true
  try {
    const access = await api.get<AccountTypeRecord>(`/api/v1/account-types/${item.id}/access`)
    selectedAccountType.value = access
    selectedRoleIds.value = access.roles?.map(role => role.id) ?? []
    selectedModuleIds.value = access.system_modules?.map(module => module.id) ?? []
    accessOpen.value = true
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const saveAccess = async () => {
  if (!selectedAccountType.value) return
  isSaving.value = true; resetMessages()
  try {
    await api.mutate(`/api/v1/account-types/${selectedAccountType.value.id}/modules`, 'PUT', { module_ids: selectedModuleIds.value })
    await api.mutate(`/api/v1/account-types/${selectedAccountType.value.id}/roles`, 'PUT', { role_ids: selectedRoleIds.value })
    accessOpen.value = false; successMessage.value = 'Account access updated.'
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const removeAccountType = async (item: AccountTypeRecord) => {
  if (!confirm(`Delete the ${item.name} account type?`)) return
  resetMessages()
  try { await api.mutate(`/api/v1/account-types/${item.id}`, 'DELETE'); successMessage.value = 'Account type deleted.'; await refresh() }
  catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Configuration" current="Account types" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Account types"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search account types"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />New account type</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Account type</th><th>Code</th><th>Order</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="item in filteredAccountTypes" :key="item.id">
              <td><p class="font-bold">{{ item.name }}</p><p class="max-w-md truncate text-xs text-base-content/50">{{ item.description || 'No description' }}</p></td>
              <td><span class="badge badge-ghost font-mono text-xs">{{ item.code }}</span></td>
              <td>{{ item.sort_order }}</td>
              <td><span :class="['badge badge-sm', item.active ? 'badge-success' : 'badge-ghost']">{{ item.active ? 'Active' : 'Inactive' }}</span></td>
              <td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm" @click="openAccess(item)"><Icon name="lucide:key-round" />Access</button><button class="btn btn-ghost btn-sm btn-square" aria-label="Edit" @click="openEdit(item)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" aria-label="Delete" @click="removeAccountType(item)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!filteredAccountTypes.length"><td colspan="5" class="py-14 text-center text-base-content/50">No account types match this search.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit account type' : 'Create account type'" description="The code is stored in uppercase and used as a stable system identifier." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveAccountType">
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Name</legend><input v-model="form.name" class="input w-full" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Code</legend><input v-model="form.code" class="input w-full font-mono" required placeholder="SHOPPER"></fieldset></div>
        <fieldset class="fieldset"><legend class="fieldset-legend">Description</legend><textarea v-model="form.description" class="textarea w-full" rows="3" /></fieldset>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" min="0" type="number"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span class="text-sm font-semibold">Active</span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></div>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save account type</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>

    <ConfigurationDialog :open="accessOpen" wide :title="`Access for ${selectedAccountType?.name ?? ''}`" description="Choose the roles this account type can receive and the system modules its users can enter." @close="accessOpen = false">
      <div class="grid gap-5 sm:grid-cols-2">
        <fieldset class="min-w-0 rounded-box bg-base-200 p-4"><legend class="px-1 text-sm font-bold">Allowed roles</legend><div class="mt-2 space-y-2"><label v-for="role in roles" :key="role.id" :class="['flex min-h-12 cursor-pointer items-center gap-3 rounded-field border bg-base-100 px-3 py-2.5', selectedRoleIds.includes(role.id) ? 'border-primary' : 'border-base-300 hover:border-base-content/25']"><input v-model="selectedRoleIds" :value="role.id" type="checkbox" class="checkbox checkbox-primary checkbox-sm"><span class="min-w-0 grow truncate font-medium">{{ role.name }}</span></label></div></fieldset>
        <fieldset class="min-w-0 rounded-box bg-base-200 p-4"><legend class="px-1 text-sm font-bold">Visible modules</legend><div class="mt-2 space-y-2"><label v-for="module in modules" :key="module.id" :class="['flex min-h-12 cursor-pointer items-center gap-3 rounded-field border bg-base-100 px-3 py-2.5', selectedModuleIds.includes(module.id) ? 'border-primary' : 'border-base-300 hover:border-base-content/25']"><input v-model="selectedModuleIds" :value="module.id" type="checkbox" class="checkbox checkbox-primary checkbox-sm"><Icon :name="module.icon || 'lucide:panels-top-left'" class="size-4 text-base-content/55" /><span class="min-w-0 grow truncate font-medium">{{ module.name }}</span></label></div></fieldset>
      </div>
      <ConfigurationDialogActions><button class="btn btn-ghost" @click="accessOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving" @click="saveAccess"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save access</button></ConfigurationDialogActions>
    </ConfigurationDialog>
  </section>
</template>
