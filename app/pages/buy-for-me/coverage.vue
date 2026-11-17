<script setup lang="ts">
import type { CityRecord, CountryRecord, RouteClassification } from '~/types/coverage'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const countryDialogOpen = ref(false)
const cityDialogOpen = ref(false)
const editingCountryId = ref<number | null>(null)
const editingCityId = ref<number | null>(null)
const selectedCountry = ref<CountryRecord | null>(null)
const destinationCityId = ref<number | null>(null)
const shopCityId = ref<number | null>(null)
const classification = ref<RouteClassification | null>(null)
const isClassifying = ref(false)

const countryForm = reactive({ name: '', code: '', active: true, sort_order: 0 })
const cityForm = reactive({ name: '', active: true, sort_order: 0 })

const { data: countries, status, refresh } = await useAsyncData(
  'buy-for-me-coverage-admin',
  () => api.get<CountryRecord[]>('/api/v1/countries'),
  { default: () => [] }
)

const cityOptions = computed(() => countries.value.flatMap(country => country.cities.map(city => ({
  ...city,
  countryName: country.name,
  available: country.active && city.active
}))))
const activeCountries = computed(() => countries.value.filter(country => country.active).length)
const activeCities = computed(() => cityOptions.value.filter(city => city.available).length)

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const openCountryCreate = () => {
  resetMessages(); editingCountryId.value = null
  Object.assign(countryForm, { name: '', code: '', active: true, sort_order: countries.value.length * 10 + 10 })
  countryDialogOpen.value = true
}
const openCountryEdit = (country: CountryRecord) => {
  resetMessages(); editingCountryId.value = country.id
  Object.assign(countryForm, { name: country.name, code: country.code, active: country.active, sort_order: country.sort_order })
  countryDialogOpen.value = true
}
const saveCountry = async () => {
  isSaving.value = true; resetMessages()
  try {
    const url = editingCountryId.value ? `/api/v1/countries/${editingCountryId.value}` : '/api/v1/countries'
    await api.mutate(url, editingCountryId.value ? 'PUT' : 'POST', { ...countryForm })
    countryDialogOpen.value = false
    successMessage.value = `Country ${editingCountryId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeCountry = async (country: CountryRecord) => {
  if (!confirm(`Delete ${country.name}? Countries with cities cannot be deleted.`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/countries/${country.id}`, 'DELETE')
    successMessage.value = 'Country deleted.'; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}

const openCityCreate = (country: CountryRecord) => {
  resetMessages(); selectedCountry.value = country; editingCityId.value = null
  Object.assign(cityForm, { name: '', active: true, sort_order: country.cities.length * 10 + 10 })
  cityDialogOpen.value = true
}
const openCityEdit = (country: CountryRecord, city: CityRecord) => {
  resetMessages(); selectedCountry.value = country; editingCityId.value = city.id
  Object.assign(cityForm, { name: city.name, active: city.active, sort_order: city.sort_order })
  cityDialogOpen.value = true
}
const saveCity = async () => {
  if (!selectedCountry.value) return
  isSaving.value = true; resetMessages()
  try {
    const url = editingCityId.value
      ? `/api/v1/cities/${editingCityId.value}`
      : `/api/v1/countries/${selectedCountry.value.id}/cities`
    await api.mutate(url, editingCityId.value ? 'PUT' : 'POST', { ...cityForm })
    cityDialogOpen.value = false
    successMessage.value = `City ${editingCityId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
const removeCity = async (city: CityRecord) => {
  if (!confirm(`Delete ${city.name}?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/cities/${city.id}`, 'DELETE')
    successMessage.value = 'City deleted.'; await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}

const classifyRoute = async () => {
  if (!destinationCityId.value || !shopCityId.value) return
  resetMessages(); classification.value = null; isClassifying.value = true
  try {
    classification.value = await api.mutate<RouteClassification>('/api/v1/coverage/classify', 'POST', {
      destination_city_id: destinationCityId.value,
      shop_city_id: shopCityId.value
    })
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isClassifying.value = false }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="BuyForMe" current="Coverage" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Operating coverage"><template #action><button class="btn btn-primary" @click="openCountryCreate"><Icon name="lucide:plus" />Add country</button></template></ConfigurationCardHeader>
      <div class="space-y-5 p-5">
    <div class="card overflow-hidden bg-neutral text-neutral-content">
      <div class="card-body gap-5 p-5 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="card-title text-xl">Route preview</h2><p class="mt-1 text-sm text-neutral-content/55">Test how an active shop-to-destination route will be classified.</p></div><span v-if="classification" class="badge badge-secondary badge-lg">{{ classification.type.name }}</span></div>
        <div class="grid items-end gap-3 lg:grid-cols-[1fr_auto_1fr_auto]">
          <fieldset class="fieldset"><legend class="fieldset-legend text-neutral-content/70">Shop city</legend><select v-model="shopCityId" class="select w-full bg-neutral-content/5 text-neutral-content"><option :value="null" disabled>Select origin</option><option v-for="city in cityOptions.filter(item => item.available)" :key="city.id" :value="city.id">{{ city.name }}, {{ city.countryName }}</option></select></fieldset>
          <span class="hidden size-10 place-items-center rounded-full border border-neutral-content/15 text-secondary lg:grid"><Icon name="lucide:arrow-right" /></span>
          <fieldset class="fieldset"><legend class="fieldset-legend text-neutral-content/70">Delivery city</legend><select v-model="destinationCityId" class="select w-full bg-neutral-content/5 text-neutral-content"><option :value="null" disabled>Select destination</option><option v-for="city in cityOptions.filter(item => item.available)" :key="city.id" :value="city.id">{{ city.name }}, {{ city.countryName }}</option></select></fieldset>
          <button class="btn btn-secondary" :disabled="!shopCityId || !destinationCityId || isClassifying" @click="classifyRoute"><span v-if="isClassifying" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:route" />Classify</button>
        </div>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <article v-for="country in countries" :key="country.id" class="card card-border bg-base-100">
        <div class="card-body p-0">
          <div class="flex items-start justify-between gap-4 border-b border-base-300 p-5">
            <div class="flex min-w-0 items-center gap-3"><span class="grid size-11 shrink-0 place-items-center rounded-field bg-base-200 font-black">{{ country.code }}</span><div class="min-w-0"><h2 class="card-title truncate">{{ country.name }}</h2><p class="text-sm text-base-content/50">{{ country.cities.length }} {{ country.cities.length === 1 ? 'city' : 'cities' }} · order {{ country.sort_order }}</p></div></div>
            <div class="flex items-center gap-1"><span :class="['badge badge-sm', country.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ country.active ? 'Active' : 'Inactive' }}</span><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${country.name}`" @click="openCountryEdit(country)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${country.name}`" @click="removeCountry(country)"><Icon name="lucide:trash-2" /></button></div>
          </div>
          <div class="divide-y divide-base-300">
            <div v-for="city in country.cities" :key="city.id" class="flex items-center gap-3 px-5 py-3.5"><span :class="['status', country.active && city.active ? 'status-success' : 'status-neutral']" /><div class="min-w-0 grow"><p class="font-semibold">{{ city.name }}</p><p class="text-xs text-base-content/45">Order {{ city.sort_order }}<span v-if="!country.active && city.active"> · hidden while country is inactive</span></p></div><span :class="['badge badge-sm', city.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ city.active ? 'Active' : 'Inactive' }}</span><button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${city.name}`" @click="openCityEdit(country, city)"><Icon name="lucide:pencil" /></button><button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${city.name}`" @click="removeCity(city)"><Icon name="lucide:trash-2" /></button></div>
            <div v-if="!country.cities.length" class="px-5 py-7 text-center text-sm text-base-content/45">No operating cities yet.</div>
          </div>
          <div class="card-actions border-t border-base-300 p-4"><button class="btn btn-ghost btn-sm" @click="openCityCreate(country)"><Icon name="lucide:map-pin-plus" />Add city</button></div>
        </div>
      </article>
      <div v-if="!countries.length" class="card card-border xl:col-span-2"><div class="card-body items-center py-14 text-center"><Icon name="lucide:map" class="size-10 text-base-content/25" /><h2 class="card-title">No coverage configured</h2><p class="text-base-content/55">Add the first operating country, then add its cities.</p><button class="btn btn-primary mt-3" @click="openCountryCreate">Add country</button></div></div>
    </div>
      </div>
    </div>

    <ConfigurationDialog :open="countryDialogOpen" :title="editingCountryId ? 'Edit country' : 'Add country'" description="Use the official two-letter ISO country code." @close="countryDialogOpen = false">
      <form class="space-y-4" @submit.prevent="saveCountry"><div class="grid gap-4 sm:grid-cols-[1fr_8rem]"><fieldset class="fieldset"><legend class="fieldset-legend">Country name</legend><input v-model="countryForm.name" class="input w-full" required></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">ISO code</legend><input v-model="countryForm.code" class="input w-full uppercase" minlength="2" maxlength="2" required></fieldset></div><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="countryForm.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span class="text-sm font-semibold">Active</span><input v-model="countryForm.active" type="checkbox" class="toggle toggle-success"></label></div><ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="countryDialogOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save country</button></ConfigurationDialogActions></form>
    </ConfigurationDialog>

    <ConfigurationDialog :open="cityDialogOpen" :title="editingCityId ? 'Edit city' : `Add city to ${selectedCountry?.name ?? ''}`" description="A city is available only while both it and its country are active." @close="cityDialogOpen = false">
      <form class="space-y-4" @submit.prevent="saveCity"><fieldset class="fieldset"><legend class="fieldset-legend">City name</legend><input v-model="cityForm.name" class="input w-full" required></fieldset><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="cityForm.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span class="text-sm font-semibold">Active</span><input v-model="cityForm.active" type="checkbox" class="toggle toggle-success"></label></div><ConfigurationDialogActions><button type="button" class="btn btn-ghost" @click="cityDialogOpen = false">Cancel</button><button class="btn btn-primary" :disabled="isSaving"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save city</button></ConfigurationDialogActions></form>
    </ConfigurationDialog>
  </section>
</template>
