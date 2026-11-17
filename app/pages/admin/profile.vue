<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const { currentUser, refreshIdentity } = useAdminAuth()
const profileSaving = ref(false)
const passwordSaving = ref(false)
const profileMessage = ref('')
const profileError = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
const profile = reactive({ name: '', email: '', gender: '', date_of_birth: '' })
const password = reactive({ current_password: '', password: '', password_confirmation: '' })

watch(currentUser, (user) => {
  if (!user) return
  Object.assign(profile, {
    name: user.name,
    email: user.email,
    gender: user.gender ?? '',
    date_of_birth: user.date_of_birth ?? ''
  })
}, { immediate: true })

const initials = computed(() => (currentUser.value?.name ?? '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'AD')

const saveProfile = async () => {
  profileSaving.value = true; profileMessage.value = ''; profileError.value = ''
  try {
    await api.mutate('/api/v1/me/profile', 'PUT', {
      ...profile,
      gender: profile.gender || null,
      date_of_birth: profile.date_of_birth || null
    })
    await refreshIdentity()
    profileMessage.value = 'Profile updated.'
  } catch (error) { profileError.value = configurationErrorMessage(error) }
  finally { profileSaving.value = false }
}

const savePassword = async () => {
  passwordSaving.value = true; passwordMessage.value = ''; passwordError.value = ''
  try {
    await api.mutate('/api/v1/me/password', 'PUT', { ...password })
    Object.assign(password, { current_password: '', password: '', password_confirmation: '' })
    passwordMessage.value = 'Password updated. Other sessions were signed out.'
  } catch (error) { passwordError.value = configurationErrorMessage(error) }
  finally { passwordSaving.value = false }
}
</script>

<template>
  <section>
    <header class="mb-7 border-b border-base-300 pb-7">
      <p class="mb-2 text-sm font-semibold text-primary">Your account</p>
      <h1 class="text-3xl font-black tracking-[-0.035em] sm:text-4xl">Profile</h1>
      <p class="mt-2 max-w-2xl leading-7 text-base-content/60">Keep your administrator identity and sign-in credentials current.</p>
    </header>

    <div class="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="card card-border h-fit bg-base-100">
        <div class="card-body items-center text-center">
          <div class="avatar avatar-placeholder">
            <div class="w-24 rounded-full bg-neutral text-2xl font-black text-neutral-content"><span>{{ initials }}</span></div>
          </div>
          <div>
            <h2 class="text-xl font-black">{{ currentUser?.name }}</h2>
            <p class="mt-1 text-sm text-base-content/55">{{ currentUser?.email }}</p>
          </div>
          <div class="flex flex-wrap justify-center gap-2">
            <span v-for="role in currentUser?.roles" :key="role" class="badge badge-neutral capitalize">{{ role.replaceAll('_', ' ') }}</span>
          </div>
          <div class="w-full border-t border-base-300 pt-4 text-left">
            <p class="text-xs text-base-content/45">Account types</p>
            <p class="mt-1 font-semibold">{{ currentUser?.account_types.map(type => type.name).join(', ') || 'None assigned' }}</p>
          </div>
        </div>
      </aside>

      <div class="space-y-6">
        <form class="card card-border bg-base-100" @submit.prevent="saveProfile">
          <div class="card-body">
            <div><h2 class="card-title">Personal details</h2><p class="mt-1 text-sm text-base-content/55">Used to identify you throughout the operations workspace.</p></div>
            <div v-if="profileMessage" role="alert" class="alert alert-success"><Icon name="lucide:circle-check" /><span>{{ profileMessage }}</span></div>
            <div v-if="profileError" role="alert" class="alert alert-error"><Icon name="lucide:triangle-alert" /><span>{{ profileError }}</span></div>
            <div class="grid gap-4 sm:grid-cols-2">
              <fieldset class="fieldset"><legend class="fieldset-legend">Full name</legend><input v-model="profile.name" class="input w-full" required></fieldset>
              <fieldset class="fieldset"><legend class="fieldset-legend">Email address</legend><input v-model="profile.email" class="input w-full" type="email" required></fieldset>
              <fieldset class="fieldset"><legend class="fieldset-legend">Gender</legend><select v-model="profile.gender" class="select w-full"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option></select></fieldset>
              <fieldset class="fieldset"><legend class="fieldset-legend">Date of birth</legend><input v-model="profile.date_of_birth" class="input w-full" type="date"></fieldset>
            </div>
            <div class="card-actions justify-end border-t border-base-300 pt-5"><button class="btn btn-primary" :disabled="profileSaving"><span v-if="profileSaving" class="loading loading-spinner loading-sm" />Save profile</button></div>
          </div>
        </form>

        <form class="card card-border bg-base-100" @submit.prevent="savePassword">
          <div class="card-body">
            <div><h2 class="card-title">Password</h2><p class="mt-1 text-sm text-base-content/55">Changing it signs out every other active session.</p></div>
            <div v-if="passwordMessage" role="alert" class="alert alert-success"><Icon name="lucide:circle-check" /><span>{{ passwordMessage }}</span></div>
            <div v-if="passwordError" role="alert" class="alert alert-error"><Icon name="lucide:triangle-alert" /><span>{{ passwordError }}</span></div>
            <fieldset class="fieldset"><legend class="fieldset-legend">Current password</legend><input v-model="password.current_password" class="input w-full" type="password" autocomplete="current-password" required></fieldset>
            <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">New password</legend><input v-model="password.password" class="input w-full" type="password" minlength="10" autocomplete="new-password" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Confirm new password</legend><input v-model="password.password_confirmation" class="input w-full" type="password" minlength="10" autocomplete="new-password" required></fieldset></div>
            <div class="card-actions justify-end border-t border-base-300 pt-5"><button class="btn btn-primary" :disabled="passwordSaving"><span v-if="passwordSaving" class="loading loading-spinner loading-sm" />Update password</button></div>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
