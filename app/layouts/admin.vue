<script setup lang="ts">
const route = useRoute()
const { currentUser, logout } = useAdminAuth()
const isSigningOut = ref(false)
const signOutError = ref('')

const systemModules = computed(() => currentUser.value?.modules ?? [])

const isRouteActive = (url: string) =>
  route.path === url || route.path.startsWith(`${url}/`)

const isModuleActive = (moduleId: number) =>
  systemModules.value
    .find(module => module.id === moduleId)
    ?.submodules.some(submodule => isRouteActive(submodule.url)) ?? false

const initials = computed(() => (currentUser.value?.name ?? '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'AD')

const roleLabel = computed(() => currentUser.value?.roles?.[0]?.replaceAll('_', ' ') || 'Administrator')

const signOut = async () => {
  isSigningOut.value = true
  signOutError.value = ''

  try {
    await logout()
  } catch (error) {
    signOutError.value = configurationErrorMessage(error)
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <div class="drawer lg:drawer-open">
    <input id="admin-navigation" type="checkbox" class="drawer-toggle">

    <div class="drawer-content min-h-screen bg-base-200">
      <header class="navbar sticky top-0 z-20 min-h-20 border-b border-base-300 bg-base-100/95 px-4 backdrop-blur sm:px-7">
        <div class="navbar-start gap-3">
          <label for="admin-navigation" class="btn btn-ghost btn-square drawer-button lg:hidden" aria-label="Open navigation">
            <Icon name="lucide:menu" class="size-5" />
          </label>
          <div class="hidden items-center gap-2 rounded-field border border-base-300 px-3 md:flex">
            <Icon name="lucide:search" class="size-4 text-base-content/40" />
            <input class="h-10 w-52 bg-transparent text-sm outline-none xl:w-72" placeholder="Search requests, users…" aria-label="Search">
            <kbd class="kbd kbd-sm text-base-content/45">⌘ K</kbd>
          </div>
        </div>

        <div class="navbar-end gap-2">
          <button class="btn btn-ghost btn-square" aria-label="Notifications">
            <span class="indicator">
              <span class="indicator-item status status-accent" />
              <Icon name="lucide:bell" class="size-5" />
            </span>
          </button>
          <details class="dropdown dropdown-end">
            <summary class="btn btn-ghost h-auto gap-3 px-2 py-1.5">
              <div class="avatar avatar-placeholder">
                <div class="w-9 rounded-full bg-neutral text-sm font-bold text-neutral-content"><span>{{ initials }}</span></div>
              </div>
              <span class="hidden text-left sm:block">
                <span class="block text-sm font-bold">{{ currentUser?.name || 'Administrator' }}</span>
                <span class="block text-xs font-normal capitalize text-base-content/50">{{ roleLabel }}</span>
              </span>
              <Icon name="lucide:chevron-down" class="hidden size-4 text-base-content/40 sm:block" />
            </summary>
            <ul class="menu dropdown-content z-30 mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
              <li><NuxtLink to="/admin/profile"><Icon name="lucide:user-round" />Profile</NuxtLink></li>
              <li><NuxtLink to="/admin/settings"><Icon name="lucide:settings" />Settings</NuxtLink></li>
              <li>
                <button :disabled="isSigningOut" @click="signOut">
                  <span v-if="isSigningOut" class="loading loading-spinner loading-xs" />
                  <Icon v-else name="lucide:log-out" />
                  {{ isSigningOut ? 'Signing out' : 'Sign out' }}
                </button>
              </li>
            </ul>
          </details>
        </div>
      </header>

      <div v-if="signOutError" role="alert" class="alert alert-error fixed right-5 top-24 z-50 w-auto max-w-md shadow-xl">
        <Icon name="lucide:triangle-alert" />
        <span>{{ signOutError }}</span>
        <button class="btn btn-ghost btn-sm btn-circle" aria-label="Dismiss" @click="signOutError = ''"><Icon name="lucide:x" /></button>
      </div>

      <main class="mx-auto w-full max-w-[1500px] p-4 sm:p-7 lg:p-9">
        <slot />
      </main>
    </div>

    <div class="drawer-side z-30">
      <label for="admin-navigation" aria-label="Close navigation" class="drawer-overlay" />
      <aside class="flex min-h-full w-72 flex-col bg-neutral px-4 py-6 text-neutral-content">
        <NuxtLink to="/admin" class="mb-9 flex items-center gap-3 px-2">
          <span class="grid size-11 place-items-center rounded-field bg-secondary text-xl font-black text-secondary-content">B</span>
          <span>
            <span class="block text-lg font-extrabold leading-5 tracking-tight">BuyForMe</span>
            <span class="text-xs text-neutral-content/50">Operations desk</span>
          </span>
        </NuxtLink>

        <nav aria-label="Admin navigation">
          <ul class="menu w-full gap-1 p-0">
            <li>
              <NuxtLink
                to="/admin"
                :class="[
                  'min-h-11 gap-3 text-neutral-content/70 hover:bg-neutral-content/10 hover:text-neutral-content',
                  route.path === '/admin' ? 'menu-active bg-primary text-primary-content hover:bg-primary hover:text-primary-content' : ''
                ]"
              >
                <Icon name="lucide:layout-dashboard" class="size-5" />
                <span class="grow">Overview</span>
              </NuxtLink>
            </li>

            <li v-for="systemModule in systemModules" :key="systemModule.id">
              <details :open="isModuleActive(systemModule.id) || systemModules.length === 1">
                <summary class="min-h-11 gap-3 text-neutral-content/75 hover:bg-neutral-content/10 hover:text-neutral-content">
                  <Icon :name="systemModule.icon || 'lucide:panels-top-left'" class="size-5" />
                  <span class="grow">{{ systemModule.name }}</span>
                </summary>

                <ul>
                  <li v-for="submodule in systemModule.submodules" :key="submodule.id">
                    <NuxtLink
                      :to="submodule.url"
                      :class="[
                        'min-h-10 gap-3 text-neutral-content/60 hover:bg-neutral-content/10 hover:text-neutral-content',
                        isRouteActive(submodule.url) ? 'menu-active bg-primary text-primary-content hover:bg-primary hover:text-primary-content' : ''
                      ]"
                    >
                      <Icon :name="submodule.icon || 'lucide:panel-top'" class="size-4" />
                      <span class="grow">{{ submodule.name }}</span>
                    </NuxtLink>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </nav>

        <div class="mt-auto rounded-box border border-neutral-content/10 bg-neutral-content/5 p-4">
          <div class="mb-3 flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-full bg-success text-success-content"><Icon name="lucide:activity" class="size-4" /></span>
            <div>
              <p class="text-sm font-bold">All systems ready</p>
              <p class="text-xs text-neutral-content/50">API responding normally</p>
            </div>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-neutral-content/10">
            <div class="h-full w-[92%] rounded-full bg-success" />
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
