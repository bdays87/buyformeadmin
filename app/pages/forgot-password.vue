<script setup lang="ts">
import type { ApiResponse } from '~/types/auth'

definePageMeta({ layout: false, middleware: ['sanctum:guest'] })

const client = useSanctumClient()
const email = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const requestSent = ref(false)

const sendResetLink = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await client<ApiResponse<never>>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value }
    })
    requestSent.value = true
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
      <div class="relative z-10 flex items-center gap-3">
        <span class="grid size-11 place-items-center rounded-field bg-secondary text-xl font-black text-secondary-content">B</span>
        <div><p class="text-lg font-extrabold tracking-tight">BuyForMe</p><p class="text-sm text-neutral-content/60">Operations desk</p></div>
      </div>
      <div class="relative z-10 my-auto max-w-xl">
        <span class="mb-8 grid size-16 place-items-center rounded-full bg-secondary text-secondary-content shadow-xl"><Icon name="lucide:key-round" class="size-7" /></span>
        <h1 class="font-display text-6xl leading-[0.98] tracking-[-0.035em]">A secure way<br>back in.</h1>
        <p class="mt-7 max-w-md text-base leading-7 text-neutral-content/65">Reset links are time-limited and can only be used once. Your existing sessions will close when the password changes.</p>
      </div>
      <p class="relative z-10 text-sm text-neutral-content/50">BuyForMe · Admin workspace</p>
    </section>

    <section class="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
      <div class="w-full max-w-md">
        <div class="mb-12 flex items-center gap-3 lg:hidden"><span class="grid size-10 place-items-center rounded-field bg-neutral font-black text-neutral-content">B</span><span class="text-lg font-extrabold">BuyForMe</span></div>

        <template v-if="requestSent">
          <div class="mb-7 grid size-14 place-items-center rounded-full bg-success/15 text-success"><Icon name="lucide:mail-check" class="size-7" /></div>
          <h2 class="text-4xl font-black tracking-[-0.04em]">Check your inbox</h2>
          <p class="mt-4 leading-7 text-base-content/60">If an account exists for <strong class="text-base-content">{{ email }}</strong>, we sent it a password reset link.</p>
          <div role="alert" class="alert alert-info alert-soft mt-7 text-sm"><Icon name="lucide:clock-3" class="size-5" /><span>The link expires in 60 minutes. Check spam if it does not arrive.</span></div>
          <NuxtLink to="/" class="btn btn-primary btn-lg btn-block mt-8"><Icon name="lucide:arrow-left" />Back to sign in</NuxtLink>
          <button type="button" class="btn btn-ghost btn-block mt-2" @click="requestSent = false">Try another email</button>
        </template>

        <template v-else>
          <p class="mb-3 text-sm font-semibold text-base-content/55">Account recovery</p>
          <h2 class="text-4xl font-black tracking-[-0.04em]">Reset your password</h2>
          <p class="mt-4 leading-7 text-base-content/60">Enter the email address attached to your administrator account.</p>
          <form class="mt-9 space-y-6" @submit.prevent="sendResetLink">
            <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm"><Icon name="lucide:circle-alert" class="size-5" /><span>{{ errorMessage }}</span></div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Email address</legend>
              <label class="input input-lg flex w-full items-center gap-3 focus-within:outline-2 focus-within:outline-primary"><Icon name="lucide:mail" class="size-5 text-base-content/40" /><input v-model.trim="email" type="email" autocomplete="email" placeholder="you@buyforme.co.zw" class="grow" required></label>
            </fieldset>
            <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="isSubmitting"><span v-if="isSubmitting" class="loading loading-spinner loading-sm" />{{ isSubmitting ? 'Sending link' : 'Send reset link' }}</button>
          </form>
          <NuxtLink to="/" class="btn btn-ghost btn-block mt-4"><Icon name="lucide:arrow-left" />Back to sign in</NuxtLink>
        </template>
      </div>
    </section>
  </main>
</template>
