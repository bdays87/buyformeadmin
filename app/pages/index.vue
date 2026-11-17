<script setup lang="ts">
import type { AdminUser } from '~/types/auth'

definePageMeta({
  layout: false,
  middleware: ['sanctum:guest']
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const { login } = useSanctumAuth<AdminUser>()

interface ApiError {
  data?: { message?: string }
  response?: { _data?: { message?: string } }
}

const signIn = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await login({
      email: email.value,
      password: password.value,
      device_name: 'buyforme-admin'
    })
  } catch (error: unknown) {
    const failure = error as ApiError
    errorMessage.value = failure.data?.message
      || failure.response?._data?.message
      || 'Sign in failed. Check your email and password and try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-base-100 lg:grid-cols-[minmax(0,1.18fr)_minmax(430px,0.82fr)]">
    <section class="route-grid relative hidden min-h-screen overflow-hidden bg-neutral px-14 py-12 text-neutral-content lg:flex lg:flex-col">
      <div class="relative z-10 flex items-center gap-3">
        <span class="grid size-11 place-items-center rounded-field bg-secondary text-xl font-black text-secondary-content">B</span>
        <div>
          <p class="text-lg font-extrabold tracking-tight">BuyForMe</p>
          <p class="text-sm text-neutral-content/60">Operations desk</p>
        </div>
      </div>

      <div class="relative z-10 my-auto max-w-2xl py-16">
        <p class="mb-7 max-w-md text-base leading-7 text-neutral-content/65">
          Every request has a route. Keep the handoffs clear from shopping list to doorstep.
        </p>
        <h1 class="font-display max-w-xl text-6xl leading-[0.98] tracking-[-0.035em] text-neutral-content xl:text-7xl">
          See the whole errand move.
        </h1>

        <div class="relative mt-16 h-72 max-w-xl" aria-hidden="true">
          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 620 280" fill="none">
            <path class="login-route" d="M30 210C142 210 132 68 256 68C380 68 357 213 480 213C540 213 556 164 592 116" stroke="#F4B942" stroke-width="3" stroke-linecap="round" />
          </svg>
          <div class="absolute bottom-11 left-0 grid size-14 place-items-center rounded-full border-4 border-neutral bg-secondary text-secondary-content shadow-xl">
            <Icon name="lucide:clipboard-list" class="size-6" />
          </div>
          <div class="absolute left-[38%] top-5 grid size-14 place-items-center rounded-full border-4 border-neutral bg-base-100 text-base-content shadow-xl">
            <Icon name="lucide:shopping-basket" class="size-6" />
          </div>
          <div class="absolute bottom-10 left-[75%] grid size-14 place-items-center rounded-full border-4 border-neutral bg-accent text-accent-content shadow-xl">
            <Icon name="lucide:bike" class="size-6" />
          </div>
          <div class="absolute right-0 top-[27%] grid size-14 place-items-center rounded-full border-4 border-neutral bg-success text-success-content shadow-xl">
            <Icon name="lucide:home" class="size-6" />
          </div>
        </div>
      </div>

      <div class="relative z-10 flex items-center justify-between text-sm text-neutral-content/50">
        <span>Admin workspace</span>
        <span>Harare, Zimbabwe</span>
      </div>
    </section>

    <section class="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
      <div class="w-full max-w-md">
        <div class="mb-14 flex items-center gap-3 lg:hidden">
          <span class="grid size-10 place-items-center rounded-field bg-neutral font-black text-neutral-content">B</span>
          <span class="text-lg font-extrabold tracking-tight">BuyForMe</span>
        </div>

        <div class="mb-10">
          <p class="mb-3 text-sm font-semibold text-base-content/55">Admin access</p>
          <h2 class="text-4xl font-black tracking-[-0.04em]">Welcome back</h2>
          <p class="mt-4 max-w-sm leading-7 text-base-content/60">
            Sign in to manage requests, assignments, modules, and platform access.
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="signIn">
          <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
            <Icon name="lucide:circle-alert" class="size-5 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <div>
            <label for="email" class="mb-2 block text-sm font-bold">Email address</label>
            <label class="input input-lg flex w-full items-center gap-3 bg-base-100 focus-within:outline-2 focus-within:outline-primary">
              <Icon name="lucide:mail" class="size-5 text-base-content/40" />
              <input id="email" v-model.trim="email" type="email" autocomplete="email" placeholder="superadmin@buyforme.local" class="grow" required>
            </label>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between">
              <label for="password" class="text-sm font-bold">Password</label>
              <NuxtLink to="/forgot-password" class="link link-hover text-sm font-semibold text-base-content/60">Reset password</NuxtLink>
            </div>
            <label class="input input-lg flex w-full items-center gap-3 bg-base-100 focus-within:outline-2 focus-within:outline-primary">
              <Icon name="lucide:lock-keyhole" class="size-5 text-base-content/40" />
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" class="grow" required>
              <button type="button" class="btn btn-ghost btn-sm btn-square" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
                <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="size-5" />
              </button>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading loading-spinner loading-sm" />
            {{ isSubmitting ? 'Opening workspace' : 'Sign in' }}
          </button>
        </form>

        <div class="mt-10 border-t border-base-300 pt-6 text-sm leading-6 text-base-content/50">
          Access is restricted to authorised operations staff. Contact your system administrator if your account is locked.
        </div>
      </div>
    </section>
  </main>
</template>
