<script setup lang="ts">
import type { AccountTypeRecord, RoleRecord, UserRecord } from '~/types/configuration'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })
const api = useConfigurationApi()
const { currentUser } = useAdminAuth()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const resetLinkUserId = ref<number | null>(null)
const editorOpen = ref(false)
const accessOpen = ref(false)
const editingId = ref<number | null>(null)
const selectedUser = ref<UserRecord | null>(null)
const selectedAccountTypeIds = ref<number[]>([])
const selectedRoleIds = ref<number[]>([])
const accountTypeAccess = ref<Record<number, number[]>>({})
const form = reactive({ name: '', email: '', gender: '', date_of_birth: '', password: '', password_confirmation: '' })

const { data, status, refresh } = await useAsyncData('configuration-users', async () => {
  const [users, accountTypes, roles] = await Promise.all([
    api.get<UserRecord[]>('/api/v1/users'),
    api.get<AccountTypeRecord[]>('/api/v1/account-types'),
    api.get<RoleRecord[]>('/api/v1/roles')
  ])
  return { users, accountTypes, roles }
})
const users = computed(() => data.value?.users ?? [])
const accountTypes = computed(() => data.value?.accountTypes ?? [])
const roles = computed(() => data.value?.roles ?? [])
const filteredUsers = computed(() => { const term = search.value.trim().toLowerCase(); return term ? users.value.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(term)) : users.value })
const allowedRoles = computed(() => {
  const ids = new Set(selectedAccountTypeIds.value.flatMap(id => accountTypeAccess.value[id] ?? []))
  return roles.value.filter(role => ids.has(role.id))
})
const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }

watch(selectedAccountTypeIds, () => {
  const allowed = new Set(allowedRoles.value.map(role => role.id))
  selectedRoleIds.value = selectedRoleIds.value.filter(id => allowed.has(id))
})

const openCreate = () => { resetMessages(); editingId.value = null; Object.assign(form, { name: '', email: '', gender: '', date_of_birth: '', password: '', password_confirmation: '' }); editorOpen.value = true }
const openEdit = (user: UserRecord) => { resetMessages(); editingId.value = user.id; Object.assign(form, { name: user.name, email: user.email, gender: user.gender ?? '', date_of_birth: user.date_of_birth?.slice(0, 10) ?? '', password: '', password_confirmation: '' }); editorOpen.value = true }
const saveUser = async () => {
  isSaving.value = true; resetMessages()
  try {
    const payload: Record<string, unknown> = { name: form.name, email: form.email, gender: form.gender || null, date_of_birth: form.date_of_birth || null }
    if (form.password) { payload.password = form.password; payload.password_confirmation = form.password_confirmation }
    if (editingId.value) await api.mutate(`/api/v1/users/${editingId.value}`, 'PUT', payload)
    else await api.mutate('/api/v1/users', 'POST', { ...payload, password: form.password, password_confirmation: form.password_confirmation })
    editorOpen.value = false; successMessage.value = `User ${editingId.value ? 'updated' : 'created'}.`; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const openAccess = async (user: UserRecord) => {
  resetMessages(); isSaving.value = true
  try {
    if (!Object.keys(accountTypeAccess.value).length) {
      const accessEntries = await Promise.all(accountTypes.value.map(async type => {
        const access = await api.get<AccountTypeRecord>(`/api/v1/account-types/${type.id}/access`)
        return [type.id, access.roles?.map(role => role.id) ?? []] as const
      }))
      accountTypeAccess.value = Object.fromEntries(accessEntries)
    }
    const access = await api.get<UserRecord>(`/api/v1/users/${user.id}/access`)
    selectedUser.value = access
    selectedAccountTypeIds.value = access.account_types.map(type => type.id)
    selectedRoleIds.value = access.roles.map(role => role.id)
    accessOpen.value = true
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const saveAccess = async () => {
  if (!selectedUser.value) return
  isSaving.value = true; resetMessages()
  try {
    await api.mutate(`/api/v1/users/${selectedUser.value.id}/account-types`, 'PUT', { account_type_ids: selectedAccountTypeIds.value })
    await api.mutate(`/api/v1/users/${selectedUser.value.id}/roles`, 'PUT', { role_ids: selectedRoleIds.value })
    accessOpen.value = false; successMessage.value = 'User access updated.'; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeUser = async (user: UserRecord) => {
  if (!confirm(`Delete ${user.name}?`)) return
  resetMessages()
  try { await api.mutate(`/api/v1/users/${user.id}`, 'DELETE'); successMessage.value = 'User deleted.'; await refresh() }
  catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
const sendPasswordReset = async (user: UserRecord) => {
  if (!confirm(`Send a password reset link to ${user.email}?`)) return
  resetMessages(); resetLinkUserId.value = user.id
  try {
    await api.mutate(`/api/v1/users/${user.id}/password-reset-link`, 'POST')
    successMessage.value = `Password reset link sent to ${user.email}.`
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { resetLinkUserId.value = null }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Configuration" current="Users" />
    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Users"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search name or email"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:user-plus" />New user</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto"><table class="table"><thead><tr><th>User</th><th>Account types</th><th>Roles</th><th class="text-right">Actions</th></tr></thead><tbody>
        <tr v-for="user in filteredUsers" :key="user.id"><td><div class="flex items-center gap-3"><div class="avatar avatar-placeholder"><div class="w-10 rounded-full bg-neutral text-neutral-content"><span>{{ user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() }}</span></div></div><div><p class="font-bold">{{ user.name }}</p><p class="text-xs text-base-content/50">{{ user.email }}</p></div></div></td><td><div class="flex flex-wrap gap-1"><span v-for="type in user.account_types" :key="type.id" class="badge badge-ghost badge-sm">{{ type.name }}</span><span v-if="!user.account_types.length" class="text-xs text-base-content/40">None</span></div></td><td><div class="flex flex-wrap gap-1"><span v-for="role in user.roles" :key="role.id" class="badge badge-neutral badge-sm">{{ role.name }}</span><span v-if="!user.roles.length" class="text-xs text-base-content/40">None</span></div></td><td><div class="flex items-center justify-end gap-1 whitespace-nowrap"><button class="btn btn-ghost btn-sm" @click="openAccess(user)"><Icon name="lucide:key-round" />Access</button><div class="tooltip" data-tip="Send password reset"><button class="btn btn-ghost btn-sm btn-square" :disabled="resetLinkUserId === user.id" :aria-label="`Send password reset to ${user.name}`" @click="sendPasswordReset(user)"><span v-if="resetLinkUserId === user.id" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:mail-key" /></button></div><div class="tooltip" data-tip="Edit user"><button class="btn btn-ghost btn-sm btn-square" aria-label="Edit" @click="openEdit(user)"><Icon name="lucide:pencil" /></button></div><div class="tooltip" data-tip="Delete user"><button class="btn btn-ghost btn-sm btn-square text-error" :disabled="user.id === currentUser?.id" aria-label="Delete" @click="removeUser(user)"><Icon name="lucide:trash-2" /></button></div></div></td></tr>
        <tr v-if="!filteredUsers.length"><td colspan="4" class="py-14 text-center text-base-content/50">No users match this search.</td></tr>
      </tbody></table></div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit user' : 'Create user'" description="Passwords must contain at least ten characters. Leave it blank when editing to keep the current password." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveUser"><fieldset class="fieldset"><legend class="fieldset-legend">Full name</legend><input v-model="form.name" class="input w-full" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Email</legend><input v-model="form.email" class="input w-full" type="email" required></fieldset><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Gender</legend><input v-model="form.gender" class="input w-full" placeholder="Optional"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Date of birth</legend><input v-model="form.date_of_birth" class="input w-full" type="date"></fieldset></div><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">{{ editingId ? 'New password' : 'Password' }}</legend><input v-model="form.password" class="input w-full" type="password" :required="!editingId"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Confirm password</legend><input v-model="form.password_confirmation" class="input w-full" type="password" :required="!!form.password"></fieldset></div><ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save user</button></ConfigurationDialogActions></form>
    </ConfigurationDialog>

    <ConfigurationDialog :open="accessOpen" wide :title="`Access for ${selectedUser?.name ?? ''}`" description="Roles are limited to those allowed by the selected account types." @close="accessOpen = false">
      <div class="grid gap-7 md:grid-cols-2"><fieldset><legend class="mb-3 font-bold">Account types</legend><div class="space-y-2"><label v-for="type in accountTypes" :key="type.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 p-3 hover:bg-base-200"><input v-model="selectedAccountTypeIds" :value="type.id" type="checkbox" class="checkbox checkbox-sm"><span>{{ type.name }}</span><span v-if="!type.active" class="badge badge-ghost badge-sm ml-auto">Inactive</span></label></div></fieldset><fieldset><legend class="mb-3 font-bold">Roles</legend><div class="space-y-2"><label v-for="role in allowedRoles" :key="role.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 p-3 hover:bg-base-200"><input v-model="selectedRoleIds" :value="role.id" type="checkbox" class="checkbox checkbox-sm"><span>{{ role.name }}</span></label><p v-if="!allowedRoles.length" class="rounded-field bg-base-200 p-4 text-sm text-base-content/55">Select an account type to see its allowed roles.</p></div></fieldset></div>
      <ConfigurationDialogActions><button class="btn btn-ghost" @click="accessOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving" @click="saveAccess"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save access</button></ConfigurationDialogActions>
    </ConfigurationDialog>
  </section>
</template>
