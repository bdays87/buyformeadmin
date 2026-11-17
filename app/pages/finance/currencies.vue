<script setup lang="ts">
import type { CurrencyRecord } from '~/types/finance'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editorOpen = ref(false)
const isSaving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ code: '', name: '', symbol: '', decimal_places: 2, active: true, is_default: false, sort_order: 0 })

const { data: currencies, status, error: loadError, refresh } = await useAsyncData(
  'finance-currencies-admin',
  () => api.get<CurrencyRecord[]>('/api/v1/currencies/manage'),
  { default: () => [] }
)

const filteredCurrencies = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? currencies.value.filter(currency => `${currency.code} ${currency.name} ${currency.symbol}`.toLowerCase().includes(term)) : currencies.value
})
const defaultCurrency = computed(() => currencies.value.find(currency => currency.is_default))
const activeCount = computed(() => currencies.value.filter(currency => currency.active).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCreate = () => {
  resetMessages(); editingId.value = null
  Object.assign(form, { code: '', name: '', symbol: '', decimal_places: 2, active: true, is_default: currencies.value.length === 0, sort_order: currencies.value.length * 10 + 10 })
  editorOpen.value = true
}
const openEdit = (currency: CurrencyRecord) => {
  resetMessages(); editingId.value = currency.id
  Object.assign(form, { code: currency.code, name: currency.name, symbol: currency.symbol, decimal_places: currency.decimal_places, active: currency.active, is_default: currency.is_default, sort_order: currency.sort_order })
  editorOpen.value = true
}
const saveCurrency = async () => {
  isSaving.value = true; resetMessages()
  try {
    const url = editingId.value ? `/api/v1/currencies/${editingId.value}` : '/api/v1/currencies'
    await api.mutate(url, editingId.value ? 'PUT' : 'POST', { ...form })
    editorOpen.value = false
    successMessage.value = `Currency ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const makeDefault = async (currency: CurrencyRecord) => {
  resetMessages()
  try {
    await api.mutate(`/api/v1/currencies/${currency.id}`, 'PUT', { is_default: true })
    successMessage.value = `${currency.code} is now the default currency.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
const removeCurrency = async (currency: CurrencyRecord) => {
  if (!confirm(`Delete ${currency.name}?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/currencies/${currency.id}`, 'DELETE')
    successMessage.value = 'Currency deleted.'
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Finance" current="Currencies" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span><button class="btn btn-sm" @click="refresh()">Try again</button></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="System currencies"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search currencies"></label><button class="btn btn-primary whitespace-nowrap" @click="openCreate"><Icon name="lucide:plus" />Add currency</button></div></template></ConfigurationCardHeader>
    <div class="grid gap-4 border-b border-base-300 p-5 md:grid-cols-[1.25fr_1fr]">
      <article class="card bg-neutral text-neutral-content">
        <div class="card-body gap-4">
          <div class="flex items-start justify-between gap-4"><div><p class="text-sm text-neutral-content/55">Default settlement currency</p><h2 class="mt-1 text-3xl font-black">{{ defaultCurrency?.code || 'Not set' }}</h2></div><span class="grid size-12 place-items-center rounded-box bg-neutral-content/10 text-xl font-black">{{ defaultCurrency?.symbol || '—' }}</span></div>
          <p class="text-sm text-neutral-content/60">New financial records will use this currency unless a workflow explicitly selects another.</p>
        </div>
      </article>
      <article class="card card-border bg-base-100"><div class="card-body"><div class="flex items-center gap-3"><span class="grid size-11 place-items-center rounded-box bg-base-200 text-primary"><Icon name="lucide:shield-check" class="size-5" /></span><div><h2 class="card-title text-base">Default protection</h2><p class="mt-1 text-sm text-base-content/55">Assign another default before deactivating or deleting the current one.</p></div></div></div></article>
    </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Currency</th><th>Symbol</th><th>Precision</th><th>Payment methods</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="currency in filteredCurrencies" :key="currency.id">
              <td><div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-field bg-base-200 font-black">{{ currency.code }}</span><div><p class="font-bold">{{ currency.name }}</p><p class="text-xs text-base-content/45">Order {{ currency.sort_order }}</p></div></div></td>
              <td class="font-semibold">{{ currency.symbol }}</td>
              <td>{{ currency.decimal_places }} decimals</td>
              <td>{{ currency.payment_methods_count ?? 0 }}</td>
              <td><div class="flex flex-wrap gap-1"><span :class="['badge badge-sm', currency.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ currency.active ? 'Active' : 'Inactive' }}</span><span v-if="currency.is_default" class="badge badge-primary badge-sm">Default</span></div></td>
              <td><div class="flex justify-end gap-1"><button v-if="!currency.is_default && currency.active" class="btn btn-ghost btn-sm" @click="makeDefault(currency)">Make default</button><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${currency.name}`" @click="openEdit(currency)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${currency.name}`" @click="removeCurrency(currency)"><Icon name="lucide:trash-2" /></button></div></td>
            </tr>
            <tr v-if="!loadError && !filteredCurrencies.length"><td colspan="6" class="py-14 text-center text-base-content/50">{{ search.trim() ? 'No currencies match this search.' : 'No currencies configured yet.' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :title="editingId ? 'Edit currency' : 'Add currency'" description="Use the official three-letter ISO currency code." @close="editorOpen = false">
      <form class="space-y-4" @submit.prevent="saveCurrency">
        <div class="grid gap-4 sm:grid-cols-[1fr_8rem]"><fieldset class="fieldset"><legend class="fieldset-legend">Currency name</legend><input v-model="form.name" class="input w-full" required placeholder="United States Dollar"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">ISO code</legend><input v-model="form.code" class="input w-full font-mono uppercase" minlength="3" maxlength="3" required placeholder="USD"></fieldset></div>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Symbol</legend><input v-model="form.symbol" class="input w-full" required maxlength="10" placeholder="US$"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Decimal places</legend><input v-model.number="form.decimal_places" class="input w-full" type="number" min="0" max="4" required></fieldset></div>
        <div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Available to workflows</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success" :disabled="form.is_default"></label></div>
        <label class="flex items-center justify-between rounded-field border border-base-300 p-4"><span><span class="block text-sm font-semibold">Default currency</span><span class="text-xs text-base-content/45">Use when no currency is selected explicitly</span></span><input v-model="form.is_default" type="checkbox" class="toggle toggle-primary" :disabled="editingId !== null && form.is_default"></label>
        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="editorOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save currency</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
