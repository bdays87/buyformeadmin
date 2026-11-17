<script setup lang="ts">
import type { CurrencyRecord } from '~/types/finance'

const model = defineModel<{
  currency_code: string
  first_band_limit: number
  first_band_percent: number
  second_band_limit: number
  second_band_percent: number
  remaining_percent: number
  cap: number
  shopper_percent: number
  courier_percent: number
}>({ required: true })

withDefaults(defineProps<{
  currencies: CurrencyRecord[]
  saving: boolean
  submitLabel?: string
}>(), {
  submitLabel: 'Create policy',
})
defineEmits<{ submit: [], cancel: [] }>()

const sampleSubtotal = ref(500)
const platformShoppingPercent = computed(() => 100 - Number(model.value.shopper_percent || 0))
const platformDeliveryPercent = computed(() => 100 - Number(model.value.courier_percent || 0))
const firstBandEnd = computed(() => Number(model.value.first_band_limit || 0))
const secondBandEnd = computed(() => firstBandEnd.value + Number(model.value.second_band_limit || 0))
const previewFee = computed(() => {
  const subtotal = Math.max(0, Number(sampleSubtotal.value || 0))
  const first = Math.min(subtotal, firstBandEnd.value)
  const second = Math.min(Math.max(0, subtotal - first), Number(model.value.second_band_limit || 0))
  const remaining = Math.max(0, subtotal - first - second)
  const fee = first * Number(model.value.first_band_percent || 0) / 100
    + second * Number(model.value.second_band_percent || 0) / 100
    + remaining * Number(model.value.remaining_percent || 0) / 100
  return Math.min(Number(model.value.cap || 0), fee)
})
const money = (amount: number) => `${model.value.currency_code.toUpperCase()} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
</script>

<template>
  <form class="space-y-5" @submit.prevent="$emit('submit')">
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <div class="overflow-hidden rounded-box border border-base-300">
        <div class="grid gap-4 border-b border-base-300 p-4 sm:grid-cols-[1fr_14rem] sm:items-end"><div><h3 class="text-lg font-black">Progressive shopping fee</h3><p class="text-sm text-base-content/50">Each rate applies only to its portion of the subtotal.</p></div><fieldset class="fieldset"><legend class="fieldset-legend">Pricing currency</legend><select v-model="model.currency_code" class="select w-full" required><option v-for="currency in currencies" :key="currency.id" :value="currency.code" :disabled="!currency.active && currency.code !== model.currency_code">{{ currency.code }} · {{ currency.name }}{{ currency.active ? '' : ' (inactive)' }}</option></select></fieldset></div>
        <div class="divide-y divide-base-300">
          <div class="grid gap-3 p-4 sm:grid-cols-[2rem_1fr_8rem_7rem] sm:items-end"><span class="grid size-8 place-items-center rounded-full bg-neutral text-sm font-black text-neutral-content">1</span><div><p class="font-bold">First band</p><p class="text-xs text-base-content/50">From zero to this limit</p></div><fieldset class="fieldset"><legend class="fieldset-legend">Limit</legend><label class="input w-full"><span class="text-base-content/45">{{ model.currency_code }}</span><input v-model.number="model.first_band_limit" type="number" min="0.01" step="0.01" required></label></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Rate</legend><label class="input w-full"><input v-model.number="model.first_band_percent" type="number" min="0" max="100" required><span>%</span></label></fieldset></div>
          <div class="grid gap-3 p-4 sm:grid-cols-[2rem_1fr_8rem_7rem] sm:items-end"><span class="grid size-8 place-items-center rounded-full bg-base-300 text-sm font-black">2</span><div><p class="font-bold">Second band</p><p class="text-xs text-base-content/50">Next amount after {{ money(firstBandEnd) }}</p></div><fieldset class="fieldset"><legend class="fieldset-legend">Band size</legend><label class="input w-full"><span class="text-base-content/45">{{ model.currency_code }}</span><input v-model.number="model.second_band_limit" type="number" min="0.01" step="0.01" required></label></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Rate</legend><label class="input w-full"><input v-model.number="model.second_band_percent" type="number" min="0" max="100" required><span>%</span></label></fieldset></div>
          <div class="grid gap-3 p-4 sm:grid-cols-[2rem_1fr_8rem_7rem] sm:items-end"><span class="grid size-8 place-items-center rounded-full bg-base-300 text-sm font-black">3</span><div><p class="font-bold">Remaining subtotal</p><p class="text-xs text-base-content/50">Everything above {{ money(secondBandEnd) }}</p></div><div class="hidden sm:block" /><fieldset class="fieldset"><legend class="fieldset-legend">Rate</legend><label class="input w-full"><input v-model.number="model.remaining_percent" type="number" min="0" max="100" required><span>%</span></label></fieldset></div>
        </div>
        <div class="grid gap-3 border-t border-base-300 bg-base-200/60 p-4 sm:grid-cols-[1fr_10rem] sm:items-end"><div><p class="font-bold">Maximum shopping service fee</p><p class="text-xs text-base-content/50">The progressive fee cannot exceed this cap.</p></div><fieldset class="fieldset"><legend class="fieldset-legend">Fee cap</legend><label class="input w-full"><span class="text-base-content/45">{{ model.currency_code }}</span><input v-model.number="model.cap" type="number" min="0.01" step="0.01" required></label></fieldset></div>
      </div>

      <aside class="rounded-box bg-neutral p-4 text-neutral-content"><h3 class="text-lg font-black">Fee preview</h3><p class="text-xs text-neutral-content/60">Customer-facing fee in {{ model.currency_code }}</p><fieldset class="fieldset mt-4"><legend class="fieldset-legend text-neutral-content/70">Example subtotal</legend><label class="input w-full bg-base-100 text-base-content"><span class="text-base-content/45">{{ model.currency_code }}</span><input v-model.number="sampleSubtotal" type="number" min="0" step="0.01"></label></fieldset><div class="my-5 border-y border-neutral-content/15 py-5"><p class="text-xs text-neutral-content/60">Shopping service fee</p><p class="mt-1 text-3xl font-black">{{ money(previewFee) }}</p><p v-if="previewFee >= Number(model.cap)" class="mt-1 text-xs text-warning">Fee cap reached</p></div><div class="space-y-2 text-xs"><div class="flex justify-between"><span class="text-neutral-content/60">First {{ money(firstBandEnd) }}</span><strong>{{ model.first_band_percent }}%</strong></div><div class="flex justify-between"><span class="text-neutral-content/60">Next {{ money(Number(model.second_band_limit)) }}</span><strong>{{ model.second_band_percent }}%</strong></div><div class="flex justify-between"><span class="text-neutral-content/60">Above {{ money(secondBandEnd) }}</span><strong>{{ model.remaining_percent }}%</strong></div><div class="flex justify-between border-t border-neutral-content/15 pt-2"><span class="text-neutral-content/60">Maximum</span><strong>{{ money(Number(model.cap)) }}</strong></div></div></aside>
    </div>

    <div class="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-2"><div class="bg-base-100 p-4"><p class="font-bold">Shopping fee split</p><p class="mb-3 text-xs text-base-content/50">After verified card charges</p><fieldset class="fieldset"><legend class="fieldset-legend">Shopper share</legend><label class="input w-full"><input v-model.number="model.shopper_percent" type="number" min="0" max="100" required><span>%</span></label></fieldset><p class="mt-2 text-sm">Platform receives <strong>{{ platformShoppingPercent }}%</strong></p></div><div class="bg-base-100 p-4"><p class="font-bold">Delivery fee split</p><p class="mb-3 text-xs text-base-content/50">Separate from shopping</p><fieldset class="fieldset"><legend class="fieldset-legend">Courier share</legend><label class="input w-full"><input v-model.number="model.courier_percent" type="number" min="0" max="100" required><span>%</span></label></fieldset><p class="mt-2 text-sm">Platform receives <strong>{{ platformDeliveryPercent }}%</strong></p></div></div>

    <div role="alert" class="alert alert-info alert-soft"><Icon name="lucide:credit-card" /><span>Verified shopper card charges are recovered before the remaining shopping fee is split.</span></div>
    <ConfigurationDialogActions><button type="button" class="btn btn-ghost" :disabled="saving" @click="$emit('cancel')">Cancel</button><button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:save" />{{ submitLabel }}</button></ConfigurationDialogActions>
  </form>
</template>
