<script setup lang="ts">
import type { PermissionRecord, RoleRecord, SystemModuleRecord } from '~/types/configuration'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })
const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const editorOpen = ref(false)
const permissionsOpen = ref(false)
const editingId = ref<number | null>(null)
const selectedRole = ref<RoleRecord | null>(null)
const selectedPermissionIds = ref<number[]>([])
const permissionGroups = ref<Array<{ module: SystemModuleRecord, submodule: SystemModuleRecord['submodules'][number], permissions: PermissionRecord[] }>>([])
const form = reactive({ name: '', guard_name: 'web' })

const { data, status, refresh } = await useAsyncData('configuration-roles', () => api.get<RoleRecord[]>('/api/v1/roles'))
const roles = computed(() => data.value ?? [])
const filteredRoles = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? roles.value.filter(role => role.name.toLowerCase().includes(term)) : roles.value
})
const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }

const openCreate = () => { resetMessages(); editingId.value = null; Object.assign(form, { name: '', guard_name: 'web' }); editorOpen.value = true }
const openEdit = (role: RoleRecord) => { resetMessages(); editingId.value = role.id; Object.assign(form, { name: role.name, guard_name: role.guard_name }); editorOpen.value = true }
const saveRole = async () => {
  isSaving.value = true; resetMessages()
  try {
    if (editingId.value) await api.mutate(`/api/v1/roles/${editingId.value}`, 'PUT', { ...form })
    else await api.mutate('/api/v1/roles', 'POST', { ...form })
    editorOpen.value = false; successMessage.value = `Role ${editingId.value ? 'updated' : 'created'}.`; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const openPermissions = async (role: RoleRecord) => {
  resetMessages(); isSaving.value = true
  try {
    const modules = await api.get<SystemModuleRecord[]>('/api/v1/system-modules')
    const groups = await Promise.all(modules.flatMap(module => module.submodules.map(async submodule => ({
      module,
      submodule,
      permissions: await api.get<PermissionRecord[]>(`/api/v1/submodules/${submodule.id}/permissions`)
    }))))
    selectedRole.value = role
    selectedPermissionIds.value = role.permissions.map(permission => permission.id)
    permissionGroups.value = groups
    permissionsOpen.value = true
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const savePermissions = async () => {
  if (!selectedRole.value) return
  isSaving.value = true; resetMessages()
  try {
    await api.mutate(`/api/v1/roles/${selectedRole.value.id}/permissions`, 'PUT', { permission_ids: selectedPermissionIds.value })
    permissionsOpen.value = false; successMessage.value = 'Role permissions updated.'; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeRole = async (role: RoleRecord) => {
  if (!confirm(`Delete the ${role.name} role?`)) return
  resetMessages()
  try { await api.mutate(`/api/v1/roles/${role.id}`, 'DELETE'); successMessage.value = 'Role deleted.'; await refresh() }
  catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Configuration" current="Roles" />
    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Roles"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search roles"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />New role</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto"><table class="table"><thead><tr><th>Role</th><th>Guard</th><th>Permissions</th><th class="text-right">Actions</th></tr></thead><tbody>
        <tr v-for="role in filteredRoles" :key="role.id"><td><div class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-field bg-base-200"><Icon name="lucide:shield-check" /></span><span class="font-bold">{{ role.name }}</span></div></td><td><span class="badge badge-ghost">{{ role.guard_name }}</span></td><td>{{ role.permissions.length }}</td><td><div class="flex justify-end gap-1"><button class="btn btn-ghost btn-sm" @click="openPermissions(role)"><Icon name="lucide:key-round" />Permissions</button><button class="btn btn-ghost btn-sm btn-square" aria-label="Edit" @click="openEdit(role)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" aria-label="Delete" @click="removeRole(role)"><Icon name="lucide:trash-2" /></button></div></td></tr>
        <tr v-if="!filteredRoles.length"><td colspan="4" class="py-14 text-center text-base-content/50">No roles match this search.</td></tr>
      </tbody></table></div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit role' : 'Create role'" description="Use a short responsibility name. The web guard is used by the admin client." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveRole"><fieldset class="fieldset"><legend class="fieldset-legend">Role name</legend><input v-model="form.name" class="input w-full" required placeholder="operations_manager"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Guard</legend><input v-model="form.guard_name" class="input w-full" required></fieldset><ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save role</button></ConfigurationDialogActions></form>
    </ConfigurationDialog>

    <ConfigurationDialog :open="permissionsOpen" wide :title="`Permissions for ${selectedRole?.name ?? ''}`" description="Selecting an action automatically includes the required module and submodule access permissions." @close="permissionsOpen = false">
      <div class="space-y-5">
        <section v-for="group in permissionGroups" :key="group.submodule.id" class="rounded-box border border-base-300">
          <div class="flex items-center gap-3 border-b border-base-300 bg-base-200 px-4 py-3"><Icon :name="group.submodule.icon || group.module.icon || 'lucide:panel-top'" /><div><p class="font-bold">{{ group.submodule.name }}</p><p class="text-xs text-base-content/50">{{ group.module.name }}</p></div><span class="ml-auto text-xs text-base-content/45">{{ group.permissions.length }} permissions</span></div>
          <div class="grid gap-2 p-3 sm:grid-cols-2"><label v-for="permission in group.permissions" :key="permission.id" class="flex cursor-pointer items-start gap-3 rounded-field p-2 hover:bg-base-200"><input v-model="selectedPermissionIds" :value="permission.id" type="checkbox" class="checkbox checkbox-sm mt-0.5"><span class="break-all text-sm">{{ permission.name }}</span></label></div>
        </section>
      </div>
      <ConfigurationDialogActions><button class="btn btn-ghost" @click="permissionsOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving" @click="savePermissions"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save permissions</button></ConfigurationDialogActions>
    </ConfigurationDialog>
  </section>
</template>
