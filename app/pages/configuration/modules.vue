<script setup lang="ts">
import type { PermissionRecord, SubmoduleRecord, SystemModuleRecord } from '~/types/configuration'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })
const api = useConfigurationApi()
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const moduleEditorOpen = ref(false)
const submoduleEditorOpen = ref(false)
const permissionEditorOpen = ref(false)
const editingModuleId = ref<number | null>(null)
const editingSubmoduleId = ref<number | null>(null)
const parentModule = ref<SystemModuleRecord | null>(null)
const selectedSubmodule = ref<SubmoduleRecord | null>(null)
const permissions = ref<PermissionRecord[]>([])
const moduleForm = reactive({ name: '', icon: '', permission: '', status: 'ACTIVE', sort_order: 0 })
const submoduleForm = reactive({ name: '', icon: '', url: '', permission: '', status: 'ACTIVE', sort_order: 0 })
const permissionName = ref('')

const { data, status, refresh } = await useAsyncData('configuration-modules', () => api.get<SystemModuleRecord[]>('/api/v1/system-modules'))
const modules = computed(() => data.value ?? [])
const submoduleCount = computed(() => modules.value.reduce((total, module) => total + module.submodules.length, 0))
const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }

const openModuleCreate = () => { resetMessages(); editingModuleId.value = null; Object.assign(moduleForm, { name: '', icon: 'lucide:panels-top-left', permission: '', status: 'ACTIVE', sort_order: modules.value.length * 10 }); moduleEditorOpen.value = true }
const openModuleEdit = (module: SystemModuleRecord) => { resetMessages(); editingModuleId.value = module.id; Object.assign(moduleForm, { name: module.name, icon: module.icon ?? '', permission: module.permission, status: module.status, sort_order: module.sort_order }); moduleEditorOpen.value = true }
const saveModule = async () => {
  isSaving.value = true; resetMessages()
  try {
    const payload = { ...moduleForm, icon: moduleForm.icon || null }
    if (editingModuleId.value) await api.mutate(`/api/v1/system-modules/${editingModuleId.value}`, 'PUT', payload)
    else await api.mutate('/api/v1/system-modules', 'POST', payload)
    moduleEditorOpen.value = false; successMessage.value = `Module ${editingModuleId.value ? 'updated' : 'created'}.`; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const openSubmoduleCreate = (module: SystemModuleRecord) => { resetMessages(); parentModule.value = module; editingSubmoduleId.value = null; Object.assign(submoduleForm, { name: '', icon: 'lucide:panel-top', url: '', permission: '', status: 'ACTIVE', sort_order: module.submodules.length * 10 }); submoduleEditorOpen.value = true }
const openSubmoduleEdit = (module: SystemModuleRecord, submodule: SubmoduleRecord) => { resetMessages(); parentModule.value = module; editingSubmoduleId.value = submodule.id; Object.assign(submoduleForm, { name: submodule.name, icon: submodule.icon ?? '', url: submodule.url ?? '', permission: submodule.permission, status: submodule.status, sort_order: submodule.sort_order }); submoduleEditorOpen.value = true }
const saveSubmodule = async () => {
  if (!parentModule.value) return
  isSaving.value = true; resetMessages()
  try {
    const payload = { ...submoduleForm, icon: submoduleForm.icon || null, url: submoduleForm.url || null }
    if (editingSubmoduleId.value) await api.mutate(`/api/v1/submodules/${editingSubmoduleId.value}`, 'PUT', payload)
    else await api.mutate(`/api/v1/system-modules/${parentModule.value.id}/submodules`, 'POST', payload)
    submoduleEditorOpen.value = false; successMessage.value = `Submodule ${editingSubmoduleId.value ? 'updated' : 'created'}.`; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}

const openPermissions = async (submodule: SubmoduleRecord) => {
  resetMessages(); selectedSubmodule.value = submodule; permissionName.value = ''; isSaving.value = true
  try { permissions.value = await api.get<PermissionRecord[]>(`/api/v1/submodules/${submodule.id}/permissions`); permissionEditorOpen.value = true }
  catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const createPermission = async () => {
  if (!selectedSubmodule.value || !permissionName.value.trim()) return
  isSaving.value = true; resetMessages()
  try { await api.mutate(`/api/v1/submodules/${selectedSubmodule.value.id}/permissions`, 'POST', { name: permissionName.value }); permissionName.value = ''; permissions.value = await api.get<PermissionRecord[]>(`/api/v1/submodules/${selectedSubmodule.value.id}/permissions`); successMessage.value = 'Permission created.' }
  catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const deactivateModule = async (module: SystemModuleRecord) => { if (!confirm(`Deactivate ${module.name}?`)) return; try { await api.mutate(`/api/v1/system-modules/${module.id}`, 'DELETE'); await refresh(); successMessage.value = 'Module deactivated.' } catch (error) { errorMessage.value = configurationErrorMessage(error) } }
const deactivateSubmodule = async (submodule: SubmoduleRecord) => { if (!confirm(`Deactivate ${submodule.name}?`)) return; try { await api.mutate(`/api/v1/submodules/${submodule.id}`, 'DELETE'); await refresh(); successMessage.value = 'Submodule deactivated.' } catch (error) { errorMessage.value = configurationErrorMessage(error) } }
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Configuration" current="Modules" />
    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Modules"><template #action><button class="btn btn-primary" @click="openModuleCreate"><Icon name="lucide:plus" />New module</button></template></ConfigurationCardHeader>
      <div class="space-y-5 p-5">
      <article v-for="module in modules" :key="module.id" class="overflow-hidden rounded-box border border-base-300 bg-base-100">
        <header class="flex flex-col gap-4 border-b border-base-300 p-5 sm:flex-row sm:items-center">
          <span class="grid size-11 place-items-center rounded-field bg-neutral text-neutral-content"><Icon :name="module.icon || 'lucide:panels-top-left'" class="size-5" /></span>
          <div class="min-w-0 grow"><div class="flex items-center gap-2"><h2 class="text-lg font-black">{{ module.name }}</h2><span :class="['badge badge-sm', module.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">{{ module.status }}</span></div><p class="truncate font-mono text-xs text-base-content/45">{{ module.permission }}</p></div>
          <div class="flex gap-1"><button class="btn btn-sm" @click="openSubmoduleCreate(module)"><Icon name="lucide:plus" />Submodule</button><button class="btn btn-ghost btn-sm btn-square" aria-label="Edit module" @click="openModuleEdit(module)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-warning" aria-label="Deactivate module" @click="deactivateModule(module)"><Icon name="lucide:archive" /></button></div>
        </header>
        <div class="divide-y divide-base-300">
          <div v-for="submodule in module.submodules" :key="submodule.id" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div class="flex min-w-0 grow items-center gap-3"><Icon :name="submodule.icon || 'lucide:panel-top'" class="size-4 text-base-content/45" /><div class="min-w-0"><p class="font-bold">{{ submodule.name }}</p><p class="truncate text-xs text-base-content/45">{{ submodule.url || 'No route' }} · {{ submodule.permission }}</p></div></div>
            <span :class="['badge badge-sm', submodule.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">{{ submodule.status }}</span>
            <div class="flex gap-1"><button class="btn btn-ghost btn-sm" @click="openPermissions(submodule)"><Icon name="lucide:key-round" />Permissions</button><button class="btn btn-ghost btn-sm btn-square" aria-label="Edit submodule" @click="openSubmoduleEdit(module, submodule)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-warning" aria-label="Deactivate submodule" @click="deactivateSubmodule(submodule)"><Icon name="lucide:archive" /></button></div>
          </div>
          <p v-if="!module.submodules.length" class="px-5 py-10 text-center text-sm text-base-content/45">No submodules yet. Add one to create a navigable workspace.</p>
        </div>
      </article>
      </div>
    </div>

    <ConfigurationDialog :open="moduleEditorOpen" :title="editingModuleId ? 'Edit module' : 'Create module'" description="The default permission gates access to the complete module." @close="moduleEditorOpen = false">
      <form class="space-y-4" @submit.prevent="saveModule"><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Name</legend><input v-model="moduleForm.name" class="input w-full" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Lucide icon</legend><input v-model="moduleForm.icon" class="input w-full" placeholder="lucide:settings"></fieldset></div><fieldset class="fieldset"><legend class="fieldset-legend">Default permission</legend><input v-model="moduleForm.permission" class="input w-full font-mono" required placeholder="configuration.access"></fieldset><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Status</legend><select v-model="moduleForm.status" class="select w-full"><option>ACTIVE</option><option>INACTIVE</option></select></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="moduleForm.sort_order" class="input w-full" type="number" min="0"></fieldset></div><ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="moduleEditorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save module</button></ConfigurationDialogActions></form>
    </ConfigurationDialog>

    <ConfigurationDialog :open="submoduleEditorOpen" :title="editingSubmoduleId ? 'Edit submodule' : `Add submodule to ${parentModule?.name ?? ''}`" description="Creating a submodule also ensures both default access permissions exist." @close="submoduleEditorOpen = false">
      <form class="space-y-4" @submit.prevent="saveSubmodule"><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Name</legend><input v-model="submoduleForm.name" class="input w-full" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Lucide icon</legend><input v-model="submoduleForm.icon" class="input w-full"></fieldset></div><fieldset class="fieldset"><legend class="fieldset-legend">Route</legend><input v-model="submoduleForm.url" class="input w-full" placeholder="/configuration/example"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Default permission</legend><input v-model="submoduleForm.permission" class="input w-full font-mono" required></fieldset><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Status</legend><select v-model="submoduleForm.status" class="select w-full"><option>ACTIVE</option><option>INACTIVE</option></select></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="submoduleForm.sort_order" class="input w-full" type="number" min="0"></fieldset></div><ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="submoduleEditorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save submodule</button></ConfigurationDialogActions></form>
    </ConfigurationDialog>

    <ConfigurationDialog :open="permissionEditorOpen" :title="`Permissions for ${selectedSubmodule?.name ?? ''}`" description="Default permissions are managed automatically. Add action permissions here." @close="permissionEditorOpen = false">
      <form class="join mb-5 w-full" @submit.prevent="createPermission"><input v-model="permissionName" class="input join-item w-full font-mono" required placeholder="configuration.example.view"><button class="btn btn-primary join-item" :disabled="isSaving"><Icon name="lucide:plus" />Add</button></form>
      <div class="space-y-2"><div v-for="permission in permissions" :key="permission.id" class="flex items-center gap-3 rounded-field border border-base-300 p-3"><Icon name="lucide:key-round" class="size-4 text-base-content/40" /><span class="break-all font-mono text-sm">{{ permission.name }}</span><span v-if="permission.name === selectedSubmodule?.permission" class="badge badge-info badge-sm ml-auto">Submodule default</span></div></div>
    </ConfigurationDialog>
  </section>
</template>
