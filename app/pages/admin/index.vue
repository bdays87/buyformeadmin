<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['sanctum:auth']
})

const { currentUser } = useAdminAuth()
const firstName = computed(() => (currentUser.value?.name ?? '').split(/\s+/)[0] || 'Administrator')
const currentDate = new Intl.DateTimeFormat('en-ZW', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Africa/Harare'
}).format(new Date())

const stages = [
  { label: 'New requests', value: 18, icon: 'lucide:inbox', tone: 'bg-secondary text-secondary-content' },
  { label: 'Shopping', value: 7, icon: 'lucide:shopping-basket', tone: 'bg-info text-info-content' },
  { label: 'On the road', value: 5, icon: 'lucide:bike', tone: 'bg-accent text-accent-content' },
  { label: 'Delivered today', value: 24, icon: 'lucide:package-check', tone: 'bg-success text-success-content' }
]

const requests = [
  { id: 'BFM-1048', customer: 'Rudo Ncube', shop: 'Food World', total: '$48.70', status: 'Needs assignment', badge: 'badge-warning', time: '8 min ago' },
  { id: 'BFM-1047', customer: 'Simba Chari', shop: 'Bon Marché', total: '$73.20', status: 'Shopping', badge: 'badge-info', time: '21 min ago' },
  { id: 'BFM-1046', customer: 'Nyasha Zulu', shop: 'Pick n Pay', total: '$31.55', status: 'Ready for delivery', badge: 'badge-accent', time: '38 min ago' },
  { id: 'BFM-1045', customer: 'Tanaka Moyo', shop: 'TM Borrowdale', total: '$92.10', status: 'Delivered', badge: 'badge-success', time: '1 hr ago' }
]
</script>

<template>
  <div>
    <section class="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="mb-2 text-sm font-semibold text-base-content/55">{{ currentDate }}</p>
        <h1 class="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Good afternoon, {{ firstName }}</h1>
        <p class="mt-3 max-w-2xl text-base leading-7 text-base-content/60">The morning queue is moving. Three new requests need an assignment before shopping can begin.</p>
      </div>
      <button class="btn gap-2 self-start md:self-auto">
        <Icon name="lucide:download" class="size-4" />
        Export daily report
      </button>
    </section>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.65fr)]">
      <section class="card overflow-hidden bg-neutral text-neutral-content xl:row-span-2">
        <div class="card-body gap-0 p-0">
          <div class="flex flex-col gap-3 border-b border-neutral-content/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <h2 class="card-title text-xl">Today’s fulfilment route</h2>
              <p class="mt-1 text-sm text-neutral-content/55">54 active requests across four stages</p>
            </div>
            <span class="badge badge-success badge-soft gap-2"><span class="status status-success" />Live</span>
          </div>

          <div class="relative px-6 py-10 sm:px-8">
            <div class="absolute left-12 right-12 top-[68px] hidden h-px bg-neutral-content/15 md:block" />
            <div class="stage-grid relative gap-7 md:gap-4">
              <div v-for="(stage, index) in stages" :key="stage.label" class="flex items-center gap-4 sm:block">
                <div :class="['relative z-10 grid size-14 shrink-0 place-items-center rounded-full border-4 border-neutral', stage.tone]">
                  <Icon :name="stage.icon" class="size-5" />
                </div>
                <div class="sm:mt-5">
                  <p class="text-3xl font-black tracking-tight">{{ stage.value }}</p>
                  <p class="mt-1 text-sm text-neutral-content/55">{{ stage.label }}</p>
                  <p v-if="index === 0" class="mt-2 text-xs font-semibold text-warning">3 waiting over 15 min</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-auto grid border-t border-neutral-content/10 sm:grid-cols-3">
            <div class="p-6 sm:px-8">
              <p class="text-sm text-neutral-content/50">Average assignment</p>
              <p class="mt-2 text-2xl font-extrabold">6m 42s</p>
            </div>
            <div class="border-neutral-content/10 p-6 sm:border-x sm:px-8">
              <p class="text-sm text-neutral-content/50">On-time delivery</p>
              <p class="mt-2 text-2xl font-extrabold">94.6%</p>
            </div>
            <div class="p-6 sm:px-8">
              <p class="text-sm text-neutral-content/50">Shopping value</p>
              <p class="mt-2 text-2xl font-extrabold">US$1,284</p>
            </div>
          </div>
        </div>
      </section>

      <section class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="card-title">Action needed</h2>
              <p class="mt-1 text-sm text-base-content/55">Resolve these before the queue grows.</p>
            </div>
            <span class="badge badge-error badge-soft">5</span>
          </div>
          <div class="mt-4 space-y-1">
            <button class="flex w-full items-center gap-3 rounded-field p-3 text-left hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary">
              <span class="grid size-10 shrink-0 place-items-center rounded-full bg-warning/20 text-warning-content"><Icon name="lucide:user-round-search" /></span>
              <span class="grow"><span class="block text-sm font-bold">Assign 3 shoppers</span><span class="text-xs text-base-content/50">Oldest request: 22 minutes</span></span>
              <Icon name="lucide:chevron-right" class="size-4 text-base-content/35" />
            </button>
            <button class="flex w-full items-center gap-3 rounded-field p-3 text-left hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary">
              <span class="grid size-10 shrink-0 place-items-center rounded-full bg-error/12 text-error"><Icon name="lucide:badge-dollar-sign" /></span>
              <span class="grow"><span class="block text-sm font-bold">Review 2 payment issues</span><span class="text-xs text-base-content/50">Gateway confirmation needed</span></span>
              <Icon name="lucide:chevron-right" class="size-4 text-base-content/35" />
            </button>
          </div>
        </div>
      </section>

      <section class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title">Team availability</h2>
            <button class="btn btn-ghost btn-sm">Manage team</button>
          </div>
          <div class="stats stats-vertical mt-3 bg-base-200 sm:stats-horizontal xl:stats-vertical 2xl:stats-horizontal">
            <div class="stat py-4">
              <div class="stat-title text-xs">Shopping assistants</div>
              <div class="stat-value text-2xl">12</div>
              <div class="stat-desc text-success">9 available now</div>
            </div>
            <div class="stat py-4">
              <div class="stat-title text-xs">Drivers</div>
              <div class="stat-value text-2xl">8</div>
              <div class="stat-desc text-warning">3 on delivery</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="card card-border mt-6 bg-base-100">
      <div class="card-body px-0 pb-2">
        <div class="flex flex-col gap-3 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="card-title">Latest requests</h2>
            <p class="mt-1 text-sm text-base-content/55">Most recently updated BuyForMe orders.</p>
          </div>
          <NuxtLink to="/admin/requests" class="btn btn-ghost btn-sm self-start">View all requests</NuxtLink>
        </div>
        <div class="mt-3 overflow-x-auto">
          <table class="table min-w-[780px]">
            <thead>
              <tr><th>Request</th><th>Customer</th><th>Shop</th><th>Total</th><th>Status</th><th>Updated</th><th><span class="sr-only">Open</span></th></tr>
            </thead>
            <tbody>
              <tr v-for="request in requests" :key="request.id" class="hover:bg-base-200/70">
                <td class="font-extrabold">{{ request.id }}</td>
                <td>{{ request.customer }}</td>
                <td class="text-base-content/60">{{ request.shop }}</td>
                <td class="font-bold">{{ request.total }}</td>
                <td><span :class="['badge badge-soft whitespace-nowrap', request.badge]">{{ request.status }}</span></td>
                <td class="whitespace-nowrap text-base-content/50">{{ request.time }}</td>
                <td><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Open ${request.id}`"><Icon name="lucide:arrow-up-right" /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
