<script setup lang="ts">
import type { ApiResponse } from '~/types/auth'

definePageMeta({ layout: false })

const route = useRoute()
const client = useSanctumClient()
const auth = useSanctumAuth()
const tokenCookie = useCookie<string | null>('sanctum.token.cookie')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const token = typeof route.query.token === 'string' ? route.query.token : ''
const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const resetComplete = ref(false)
const errorMessage = ref(token ? '' : 'This password reset link is incomplete. Request a new link to continue.')

const resetPassword = async () => {
  if (!token) return
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await client<ApiResponse<never>>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token,
        email: email.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value
      }
    })
    tokenCookie.value = null
    auth.user.value = null
    resetComplete.value = true
  } catch (error) {
    errorMessage.value = configurationErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-base-100 lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
    <section class="route-grid relative hidden min-h-screen overflow-hidden bg-neutral px-14 py-12 text-neutral-content lg:flex lg:flex-col">
      <div class="relative z-10 flex items-center gap-3"><span class="grid size-11 place-items-center rounded-field bg-secondary text-xl font-black text-secondary-content">B</span><div><p class="text-lg font-extrabold">BuyForMe</p><p class="text-sm text-neutral-content/60">Operations desk</p></div></div>
      <div class="relative z-10 my-auto max-w-xl"><span class="mb-8 grid size-16 place-items-center rounded-full bg-secondary text-secondary-content shadow-xl"><Icon name="lucide:shield-check" class="size-7" /></span><h1 class="font-display text-6xl leading-[0.98] tracking-[-0.035em]">Choose a strong<br>new password.</h1><p class="mt-7 max-w-md leading-7 text-neutral-content/65">Use at least ten characters and avoid passwords used for another service.</p></div>
      <p class="relative z-10 text-sm text-neutral-content/50">BuyForMe · Admin workspace</p>
    </section>

    <section class="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
      <div class="w-full max-w-md">
        <div class="mb-12 flex items-center gap-3 lg:hidden"><span class="grid size-10 place-items-center rounded-field bg-neutral font-black text-neutral-content">B</span><span class="text-lg font-extrabold">BuyForMe</span></div>

        <template v-if="resetComplete">
          <div class="mb-7 grid size-14 place-items-center rounded-full bg-success/15 text-success"><Icon name="lucide:badge-check" class="size-7" /></div>
          <h2 class="text-4xl font-black tracking-[-0.04em]">Password changed</h2>
          <p class="mt-4 leading-7 text-base-content/60">Your password is ready. For security, all existing API sessions have been signed out.</p>
          <NuxtLink to="/" class="btn btn-primary btn-lg btn-block mt-8">Continue to sign in<Icon name="lucide:arrow-right" /></NuxtLink>
        </template>

        <template v-else>
          <p class="mb-3 text-sm font-semibold text-base-content/55">Account recovery</p>
          <h2 class="text-4xl font-black tracking-[-0.04em]">Set a new password</h2>
          <p class="mt-4 leading-7 text-base-content/60">This will replace your current password and close your active sessions.</p>
          <form class="mt-8 space-y-5" @submit.prevent="resetPassword">
            <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm"><Icon name="lucide:circle-alert" class="size-5 shrink-0" /><span>{{ errorMessage }}</span></div>
            <fieldset class="fieldset"><legend class="fieldset-legend">Email address</legend><label class="input input-lg flex w-full items-center gap-3"><Icon name="lucide:mail" class="size-5 text-base-content/40" /><input v-model.trim="email" type="email" autocomplete="email" class="grow" required></label></fieldset>
            <fieldset class="fieldset"><legend class="fieldset-legend">New password</legend><label class="input input-lg flex w-full items-center gap-3"><Icon name="lucide:lock-keyhole" class="size-5 text-base-content/40" /><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="10" class="grow" required><button type="button" class="btn btn-ghost btn-sm btn-square" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword"><Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" /></button></label><p class="fieldset-label">At least 10 characters</p></fieldset>
            <fieldset class="fieldset"><legend class="fieldset-legend">Confirm new password</legend><label class="input input-lg flex w-full items-center gap-3"><Icon name="lucide:check" class="size-5 text-base-content/40" /><input v-model="passwordConfirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="10" class="grow" required></label></fieldset>
            <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="isSubmitting || !token"><span v-if="isSubmitting" class="loading loading-spinner loading-sm" />{{ isSubmitting ? 'Updating password' : 'Update password' }}</button>
          </form>
          <NuxtLink to="/forgot-password" class="btn btn-ghost btn-block mt-4">Request a new link</NuxtLink>
        </template>
      </div>
    </section>
  </main>
</template>
