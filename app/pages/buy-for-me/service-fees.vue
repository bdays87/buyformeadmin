<script setup lang="ts">
import type { CurrencyRecord } from '~/types/finance'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

interface ServiceFeeConfiguration {
  policy_id: number
  version: string
  currency_code: string
  first_band_limit: string
  first_band_percent: number
  second_band_limit: string
  second_band_percent: number
  remaining_percent: number
  cap: string
  shopper_percent: number
  platform_shopping_percent: number
  courier_percent: number
  platform_delivery_percent: number
}

interface ServiceFeePolicy extends ServiceFeeConfiguration {
  is_current: boolean
  reference_count: number
  effective_from: string | null
  superseded_at: string | null
  created_by: { id: number, name: string, email: string } | null
}

const api = useConfigurationApi()
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const editorOpen = ref(false)
const selectedSource = ref<ServiceFeePolicy | null>(null)
const deletingPolicyId = ref<number | null>(null)
const form = reactive({
  currency_code: 'USD', first_band_limit: 100, first_band_percent: 15,
  second_band_limit: 200, second_band_percent: 10, remaining_percent: 5,
  cap: 45, shopper_percent: 55, courier_percent: 80
})

const { data: pageData, status, error: loadError, refresh } = await useAsyncData(
  'buy-for-me-service-fees',
  async () => {
    const [configuration, currencies, history] = await Promise.all([
      api.get<ServiceFeeConfiguration>('/api/v1/buy-for-me/service-fees'),
      api.get<CurrencyRecord[]>('/api/v1/currencies/manage'),
      api.get<ServiceFeePolicy[]>('/api/v1/buy-for-me/service-fees/history')
    ])
    return { configuration, currencies, history }
  },
  { default: () => ({ configuration: null as ServiceFeeConfiguration | null, currencies: [] as CurrencyRecord[], history: [] as ServiceFeePolicy[] }) }
)

const configuration = computed(() => pageData.value.configuration)
const currencies = computed(() => pageData.value.currencies)
const history = computed(() => pageData.value.history)

const applyConfiguration = (value: ServiceFeeConfiguration) => Object.assign(form, {
  currency_code: value.currency_code,
  first_band_limit: Number(value.first_band_limit), first_band_percent: value.first_band_percent,
  second_band_limit: Number(value.second_band_limit), second_band_percent: value.second_band_percent,
  remaining_percent: value.remaining_percent, cap: Number(value.cap),
  shopper_percent: value.shopper_percent, courier_percent: value.courier_percent
})

const openEditor = (source: ServiceFeePolicy | null = null) => {
  const values = source ?? configuration.value
  if (!values) return
  applyConfiguration(values)
  selectedSource.value = source
  errorMessage.value = ''
  successMessage.value = ''
  editorOpen.value = true
}
const policyMoney = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const policyDate = (value: string | null) => value ? new Date(value).toLocaleString() : '—'
const save = async () => {
  isSaving.value = true; errorMessage.value = ''; successMessage.value = ''
  try {
    await api.mutate<ServiceFeeConfiguration>('/api/v1/buy-for-me/service-fees', 'PUT', { ...form, currency_code: form.currency_code.toUpperCase() })
    await refresh()
    editorOpen.value = false
    successMessage.value = selectedSource.value
      ? `A new policy was created from ${selectedSource.value.version} and activated.`
      : 'New service fee policy created and activated.'
    selectedSource.value = null
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removePolicy = async (policy: ServiceFeePolicy) => {
  if (policy.is_current || policy.reference_count > 0) return
  if (!confirm(`Delete unreferenced policy ${policy.version}?`)) return
  deletingPolicyId.value = policy.policy_id; errorMessage.value = ''; successMessage.value = ''
  try {
    await api.mutate(`/api/v1/buy-for-me/service-fees/${policy.policy_id}`, 'DELETE')
    await refresh()
    successMessage.value = 'Unreferenced policy deleted.'
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { deletingPolicyId.value = null }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="Finance" current="Service fee policies" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage && !editorOpen" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span></div>
    <ConfigurationLoadingState v-if="status === 'pending'" />

    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Policy history"><template #action><button class="btn btn-primary" :disabled="status === 'pending' || !configuration" @click="openEditor()"><Icon name="lucide:plus" />New policy</button></template></ConfigurationCardHeader>
      <div class="overflow-x-auto"><table class="table"><thead><tr><th>Version</th><th>Progressive fee</th><th>Fee split</th><th>Effective period</th><th>Created by</th><th class="text-right">Actions</th></tr></thead><tbody>
        <tr v-for="policy in history" :key="policy.policy_id"><td><div class="min-w-48"><div class="flex items-center gap-2"><span class="font-mono text-xs font-bold">{{ policy.version }}</span><span v-if="policy.is_current" class="badge badge-success badge-soft badge-sm">Current</span><span v-else class="badge badge-ghost badge-sm">Superseded</span></div><p class="mt-1 text-xs text-base-content/45">Policy #{{ policy.policy_id }} · {{ policy.currency_code }} · {{ policy.reference_count }} references</p></div></td><td><div class="min-w-56 text-sm"><p>{{ policy.first_band_percent }}% of first {{ policyMoney(policy.first_band_limit, policy.currency_code) }}</p><p>{{ policy.second_band_percent }}% of next {{ policyMoney(policy.second_band_limit, policy.currency_code) }}</p><p>{{ policy.remaining_percent }}% thereafter · cap {{ policyMoney(policy.cap, policy.currency_code) }}</p></div></td><td><div class="min-w-44 text-sm"><p>Shopping: {{ policy.shopper_percent }}% shopper / {{ policy.platform_shopping_percent }}% platform</p><p>Delivery: {{ policy.courier_percent }}% courier / {{ policy.platform_delivery_percent }}% platform</p></div></td><td><div class="min-w-48 text-sm"><p>{{ policyDate(policy.effective_from) }}</p><p class="text-xs text-base-content/45">{{ policy.is_current ? 'Active now' : `Until ${policyDate(policy.superseded_at)}` }}</p></div></td><td><div class="min-w-40"><p class="text-sm font-semibold">{{ policy.created_by?.name ?? 'System migration' }}</p><p class="text-xs text-base-content/45">{{ policy.created_by?.email ?? 'Imported policy' }}</p></div></td><td><div class="flex min-w-28 justify-end gap-1"><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${policy.version} as a new policy`" title="Create a new version from this policy" @click="openEditor(policy)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :disabled="policy.is_current || policy.reference_count > 0 || deletingPolicyId === policy.policy_id" :aria-label="`Delete ${policy.version}`" :title="policy.is_current ? 'Current policy cannot be deleted' : policy.reference_count > 0 ? 'Referenced policies must be retained' : 'Delete unreferenced policy'" @click="removePolicy(policy)"><span v-if="deletingPolicyId === policy.policy_id" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:trash-2" /></button></div></td></tr>
        <tr v-if="!history.length"><td colspan="6" class="py-12 text-center text-base-content/50">No policy versions have been recorded.</td></tr>
      </tbody></table></div>
    </div>

    <ConfigurationDialog :open="editorOpen" wide :title="selectedSource ? 'Edit as new policy' : 'Create service fee policy'" :description="selectedSource ? `Values copied from ${selectedSource.version}. Saving creates a new immutable version.` : 'A new immutable version becomes active immediately. Existing quotes and orders keep their original policy.'" @close="editorOpen = false">
      <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
      <ServiceFeePolicyForm v-model="form" :currencies="currencies" :saving="isSaving" :submit-label="selectedSource ? 'Update policy' : 'Create policy'" @cancel="editorOpen = false" @submit="save" />
    </ConfigurationDialog>
  </section>
</template>
