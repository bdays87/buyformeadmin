<script setup lang="ts">
import type { AdminSettings } from '~/types/profile'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })
const api = useConfigurationApi()
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const form = reactive({
  timezone: 'Africa/Harare' as AdminSettings['timezone'],
  locale: 'en-ZW' as AdminSettings['locale'],
  email_notifications: true,
  browser_notifications: true,
  weekly_summary: false
})

const { data, status } = await useAsyncData('admin-settings', () => api.get<AdminSettings>('/api/v1/me/settings'))
watch(data, settings => { if (settings) Object.assign(form, settings) }, { immediate: true })

const saveSettings = async () => {
  isSaving.value = true; successMessage.value = ''; errorMessage.value = ''
  try {
    const updated = await api.mutate<AdminSettings>('/api/v1/me/settings', 'PUT', { ...form })
    Object.assign(form, updated)
    successMessage.value = 'Settings saved.'
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
</script>

<template>
  <section>
    <header class="mb-7 border-b border-base-300 pb-7">
      <p class="mb-2 text-sm font-semibold text-primary">Your account</p>
      <h1 class="text-3xl font-black tracking-[-0.035em] sm:text-4xl">Settings</h1>
      <p class="mt-2 max-w-2xl leading-7 text-base-content/60">Choose how operational updates reach you and how dates are presented.</p>
    </header>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <form v-else class="mx-auto max-w-4xl space-y-6" @submit.prevent="saveSettings">
      <div v-if="successMessage" role="alert" class="alert alert-success"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
      <div v-if="errorMessage" role="alert" class="alert alert-error"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>

      <section class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-start gap-4"><span class="grid size-11 shrink-0 place-items-center rounded-field bg-base-200"><Icon name="lucide:globe-2" class="size-5" /></span><div><h2 class="card-title">Regional defaults</h2><p class="mt-1 text-sm text-base-content/55">Controls timestamps and regional formatting in your admin workspace.</p></div></div>
          <div class="grid gap-4 sm:grid-cols-2">
            <fieldset class="fieldset"><legend class="fieldset-legend">Timezone</legend><select v-model="form.timezone" class="select w-full"><option value="Africa/Harare">Harare (CAT)</option><option value="Africa/Johannesburg">Johannesburg (SAST)</option><option value="UTC">UTC</option></select></fieldset>
            <fieldset class="fieldset"><legend class="fieldset-legend">Regional format</legend><select v-model="form.locale" class="select w-full"><option value="en-ZW">English (Zimbabwe)</option><option value="en-GB">English (United Kingdom)</option></select></fieldset>
          </div>
        </div>
      </section>

      <section class="card card-border bg-base-100">
        <div class="card-body gap-0">
          <div class="mb-4 flex items-start gap-4"><span class="grid size-11 shrink-0 place-items-center rounded-field bg-base-200"><Icon name="lucide:bell-ring" class="size-5" /></span><div><h2 class="card-title">Operational notices</h2><p class="mt-1 text-sm text-base-content/55">Choose which account-level updates you want to receive.</p></div></div>
          <label class="flex cursor-pointer items-center gap-4 border-t border-base-300 py-4"><span class="min-w-0 grow"><span class="block font-bold">Email notifications</span><span class="block text-sm text-base-content/50">Urgent request, payment, and assignment updates.</span></span><input v-model="form.email_notifications" type="checkbox" class="toggle toggle-primary"></label>
          <label class="flex cursor-pointer items-center gap-4 border-t border-base-300 py-4"><span class="min-w-0 grow"><span class="block font-bold">Browser notifications</span><span class="block text-sm text-base-content/50">Live alerts while the operations desk is open.</span></span><input v-model="form.browser_notifications" type="checkbox" class="toggle toggle-primary"></label>
          <label class="flex cursor-pointer items-center gap-4 border-y border-base-300 py-4"><span class="min-w-0 grow"><span class="block font-bold">Weekly summary</span><span class="block text-sm text-base-content/50">A concise account activity summary every Monday.</span></span><input v-model="form.weekly_summary" type="checkbox" class="toggle toggle-primary"></label>
          <div class="card-actions justify-end pt-5"><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save settings</button></div>
        </div>
      </section>
    </form>
  </section>
</template>
