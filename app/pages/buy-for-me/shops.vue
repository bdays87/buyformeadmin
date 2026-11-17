<script setup lang="ts">
import type { CountryRecord } from '~/types/coverage'
import type { CurrencyRecord, PaymentMethodRecord } from '~/types/finance'
import type { CrawlerCatalogueSource, ShopOperatingHour, ShopRecord } from '~/types/shop'
import type { VendorTypeRecord } from '~/types/vendor'

definePageMeta({ layout: 'admin', middleware: ['sanctum:auth'] })

const api = useConfigurationApi()
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editorOpen = ref(false)
const isSaving = ref(false)
const isOptimizingLogo = ref(false)
const editingId = ref<number | null>(null)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const logoInputKey = ref(0)

const defaultHours = (): ShopOperatingHour[] => days.map((_, day) => ({
  day_of_week: day,
  opens_at: day === 0 ? null : '08:00',
  closes_at: day === 0 ? null : '18:00',
  is_closed: day === 0
}))

const form = reactive({
  name: '', slug: '', country_id: null as number | null, city_id: null as number | null,
  suburb: '', street_address: '', active: true, sort_order: 0,
  catalogue_available: false, catalogue_source_slug: '',
  vendor_type_ids: [] as number[], primary_vendor_type_id: null as number | null,
  currency_ids: [] as number[], payment_method_ids: [] as number[], operating_hours: defaultHours()
})

const { data, status, error: loadError, refresh } = await useAsyncData(
  'buy-for-me-shops-admin',
  async () => {
    const [shops, countries, vendorTypes, currencies, paymentMethods] = await Promise.all([
      api.get<ShopRecord[]>('/api/v1/shops/manage'),
      api.get<CountryRecord[]>('/api/v1/coverage'),
      api.get<VendorTypeRecord[]>('/api/v1/vendor-types'),
      api.get<CurrencyRecord[]>('/api/v1/currencies'),
      api.get<PaymentMethodRecord[]>('/api/v1/payment-methods')
    ])
    return { shops, countries, vendorTypes, currencies, paymentMethods }
  },
  { default: () => ({ shops: [], countries: [], vendorTypes: [], currencies: [], paymentMethods: [] }) }
)

const {
  data: crawlerSourceData,
  status: crawlerSourceStatus,
  error: crawlerSourceError,
  refresh: refreshCrawlerSources
} = await useAsyncData(
  'buy-for-me-shop-crawler-sources',
  () => api.get<CrawlerCatalogueSource[]>('/api/v1/shops/crawler-sources'),
  { default: () => [] }
)

const shops = computed(() => data.value.shops)
const countries = computed(() => data.value.countries)
const vendorTypes = computed(() => data.value.vendorTypes)
const currencies = computed(() => data.value.currencies)
const paymentMethods = computed(() => data.value.paymentMethods)
const crawlerSources = computed(() => crawlerSourceData.value)
const selectedCrawlerSource = computed(() => crawlerSources.value.find(source => source.slug === form.catalogue_source_slug) ?? null)
const cities = computed(() => countries.value.find(country => country.id === form.country_id)?.cities ?? [])
const compatiblePaymentMethods = computed(() => paymentMethods.value.filter(method => method.currencies.some(currency => form.currency_ids.includes(currency.id))))
const activeCount = computed(() => shops.value.filter(shop => shop.active).length)
const filteredShops = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? shops.value.filter(shop => `${shop.name} ${shop.suburb} ${shop.city.name} ${shop.primary_vendor_type.name}`.toLowerCase().includes(term)) : shops.value
})

watch(() => form.country_id, () => {
  if (!cities.value.some(city => city.id === form.city_id)) form.city_id = cities.value[0]?.id ?? null
})
watch(() => [...form.vendor_type_ids], (ids) => {
  if (!ids.includes(form.primary_vendor_type_id ?? -1)) form.primary_vendor_type_id = ids[0] ?? null
})
watch(() => [...form.currency_ids], () => {
  const compatibleIds = new Set(compatiblePaymentMethods.value.map(method => method.id))
  form.payment_method_ids = form.payment_method_ids.filter(id => compatibleIds.has(id))
})
watch(() => form.catalogue_available, (available) => {
  if (!available) form.catalogue_source_slug = ''
})

const resetMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const releaseLogoPreview = () => {
  if (logoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(logoPreview.value)
}
const resetLogo = (preview: string | null = null) => {
  releaseLogoPreview()
  logoFile.value = null
  logoPreview.value = preview
  logoInputKey.value++
}
const closeEditor = () => {
  if (isSaving.value) return
  editorOpen.value = false
  resetLogo()
}
const onLogoSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  if (!selected) return

  isOptimizingLogo.value = true
  errorMessage.value = ''
  try {
    const optimized = await optimizeUploadImage(selected, 512)
    releaseLogoPreview()
    logoFile.value = optimized
    logoPreview.value = URL.createObjectURL(optimized)
  } catch (error) {
    logoFile.value = null
    input.value = ''
    errorMessage.value = configurationErrorMessage(error)
  } finally {
    isOptimizingLogo.value = false
  }
}
const openCreate = () => {
  resetMessages(); editingId.value = null
  resetLogo()
  const firstCountry = countries.value[0]
  Object.assign(form, {
    name: '', slug: '', country_id: firstCountry?.id ?? null, city_id: firstCountry?.cities[0]?.id ?? null,
    suburb: '', street_address: '', active: true, sort_order: shops.value.length * 10 + 10,
    catalogue_available: false, catalogue_source_slug: '',
    vendor_type_ids: vendorTypes.value[0] ? [vendorTypes.value[0].id] : [], primary_vendor_type_id: vendorTypes.value[0]?.id ?? null,
    currency_ids: currencies.value.map(currency => currency.id), payment_method_ids: paymentMethods.value.map(method => method.id), operating_hours: defaultHours()
  })
  editorOpen.value = true
}
const openEdit = (shop: ShopRecord) => {
  resetMessages(); editingId.value = shop.id
  resetLogo(shop.logo_url)
  Object.assign(form, {
    name: shop.name, slug: shop.slug, country_id: shop.country_id, city_id: shop.city_id,
    suburb: shop.suburb, street_address: shop.street_address, active: shop.active, sort_order: shop.sort_order,
    catalogue_available: shop.catalogue_available, catalogue_source_slug: shop.catalogue_source_slug ?? '',
    vendor_type_ids: shop.vendor_types.map(type => type.id), primary_vendor_type_id: shop.primary_vendor_type_id,
    currency_ids: shop.currencies.filter(currency => currency.active).map(currency => currency.id),
    payment_method_ids: shop.payment_methods.filter(method => method.active).map(method => method.id),
    operating_hours: shop.operating_hours.map(day => ({ ...day, opens_at: day.opens_at?.slice(0, 5) ?? null, closes_at: day.closes_at?.slice(0, 5) ?? null }))
  })
  editorOpen.value = true
}
const setDayClosed = (day: ShopOperatingHour) => {
  if (day.is_closed) { day.opens_at = null; day.closes_at = null }
  else { day.opens_at ||= '08:00'; day.closes_at ||= '18:00' }
}
const saveShop = async () => {
  if (isSaving.value || isOptimizingLogo.value) return
  isSaving.value = true; resetMessages()
  try {
    const payload = new FormData()
    payload.append('name', form.name)
    if (form.slug) payload.append('slug', form.slug)
    payload.append('country_id', String(form.country_id))
    payload.append('city_id', String(form.city_id))
    payload.append('suburb', form.suburb)
    payload.append('street_address', form.street_address)
    payload.append('active', form.active ? '1' : '0')
    payload.append('sort_order', String(form.sort_order))
    payload.append('catalogue_available', form.catalogue_available ? '1' : '0')
    if (form.catalogue_available) payload.append('catalogue_source_slug', form.catalogue_source_slug)
    payload.append('primary_vendor_type_id', String(form.primary_vendor_type_id))
    form.vendor_type_ids.forEach(id => payload.append('vendor_type_ids[]', String(id)))
    form.currency_ids.forEach(id => payload.append('currency_ids[]', String(id)))
    form.payment_method_ids.forEach(id => payload.append('payment_method_ids[]', String(id)))
    form.operating_hours.forEach((day, index) => {
      payload.append(`operating_hours[${index}][day_of_week]`, String(day.day_of_week))
      payload.append(`operating_hours[${index}][is_closed]`, day.is_closed ? '1' : '0')
      if (day.opens_at) payload.append(`operating_hours[${index}][opens_at]`, day.opens_at)
      if (day.closes_at) payload.append(`operating_hours[${index}][closes_at]`, day.closes_at)
    })
    if (logoFile.value) payload.append('logo', logoFile.value)

    const url = editingId.value ? `/api/v1/shops/${editingId.value}` : '/api/v1/shops'
    if (editingId.value) payload.append('_method', 'PUT')
    await api.mutate(url, 'POST', payload)
    editorOpen.value = false
    resetLogo()
    successMessage.value = `Shop ${editingId.value ? 'updated' : 'created'}.`
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
  finally { isSaving.value = false }
}
onBeforeUnmount(releaseLogoPreview)
const removeShop = async (shop: ShopRecord) => {
  if (!confirm(`Delete ${shop.name}?`)) return
  resetMessages()
  try {
    await api.mutate(`/api/v1/shops/${shop.id}`, 'DELETE')
    successMessage.value = 'Shop deleted.'
    await refresh()
  } catch (error) { errorMessage.value = configurationErrorMessage(error) }
}
</script>

<template>
  <section>
    <ConfigurationBreadcrumbs section="BuyForMe" current="Shops" />

    <div v-if="successMessage" role="alert" class="alert alert-success mb-5"><Icon name="lucide:circle-check" /><span>{{ successMessage }}</span></div>
    <div v-if="errorMessage" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ errorMessage }}</span></div>
    <div v-if="loadError" role="alert" class="alert alert-error mb-5"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(loadError) }}</span><button class="btn btn-sm" @click="refresh()">Try again</button></div>

    <ConfigurationLoadingState v-if="status === 'pending'" />
    <div v-else class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <ConfigurationCardHeader title="Shop management"><template #action><div class="flex flex-col gap-3 sm:flex-row sm:items-center"><label class="input w-full sm:w-80"><Icon name="lucide:search" class="size-4 opacity-45" /><input v-model="search" placeholder="Search shops"></label><button class="btn btn-primary whitespace-nowrap" :disabled="!countries.length || !vendorTypes.length || !currencies.length" @click="openCreate"><Icon name="lucide:plus" />Add shop</button></div></template></ConfigurationCardHeader>
      <div class="overflow-x-auto">
        <table class="table table-md min-w-[1180px]">
          <thead>
            <tr class="border-base-300 bg-base-200/45 text-base-content/60">
              <th class="w-64 pl-6">Shop</th>
              <th class="w-64">Location</th>
              <th>Type</th>
              <th>Currencies</th>
              <th>Trading week</th>
              <th>Catalogue</th>
              <th class="w-56">Payments</th>
              <th class="pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shop in filteredShops" :key="shop.id" class="border-base-300 hover:bg-base-200/30">
              <td class="pl-6">
                <div class="flex items-center gap-3">
                  <div class="avatar">
                    <div class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-box border border-base-300 bg-base-200 text-primary">
                      <img v-if="shop.logo_url" :src="shop.logo_url" :alt="`${shop.name} logo`" class="h-full w-full object-contain p-1">
                      <Icon v-else :name="shop.primary_vendor_type.icon || 'lucide:store'" class="size-5" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-base-content">{{ shop.name }}</div>
                    <span :class="['badge badge-sm mt-1', shop.active ? 'badge-success badge-soft' : 'badge-ghost']">{{ shop.active ? 'Active' : 'Inactive' }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="max-w-64 whitespace-normal font-medium text-base-content">{{ shop.street_address }}</div>
                <div class="mt-1 text-xs text-base-content/55">{{ shop.suburb }}, {{ shop.city.name }}</div>
              </td>
              <td>
                <div class="flex items-center gap-2 whitespace-nowrap font-medium">
                  <Icon :name="shop.primary_vendor_type.icon || 'lucide:store'" class="size-4 text-base-content/45" />
                  {{ shop.primary_vendor_type.name }}
                </div>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span v-for="currency in shop.currencies" :key="currency.id" class="badge badge-outline badge-sm">{{ currency.code }}</span>
                </div>
              </td>
              <td>
                <div class="whitespace-nowrap font-medium">{{ shop.operating_hours.filter(day => !day.is_closed).length }} days open</div>
              </td>
              <td>
                <span :class="['badge badge-sm whitespace-nowrap', shop.catalogue_available ? 'badge-success badge-soft' : 'badge-ghost']">
                  <Icon :name="shop.catalogue_available ? 'lucide:database' : 'lucide:calculator'" class="size-3" />
                  {{ shop.catalogue_available ? shop.catalogue_source_name || 'Crawler catalogue' : 'Manual estimates' }}
                </span>
              </td>
              <td>
                <div class="flex max-w-56 flex-wrap gap-1">
                  <span v-for="method in shop.payment_methods" :key="method.id" class="badge badge-ghost badge-sm">
                    <Icon :name="method.icon || 'lucide:wallet-cards'" class="size-3" />{{ method.name }}
                  </span>
                </div>
              </td>
              <td class="pr-6">
                <div class="flex justify-end gap-1">
                  <button class="btn btn-ghost btn-sm btn-square" :aria-label="`Edit ${shop.name}`" @click="openEdit(shop)"><Icon name="lucide:pencil" /></button>
                  <button class="btn btn-ghost btn-sm btn-square text-error" :aria-label="`Delete ${shop.name}`" @click="removeShop(shop)"><Icon name="lucide:trash-2" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!loadError && !filteredShops.length">
              <td colspan="8" class="p-0">
                <div class="flex flex-col items-center px-6 py-14 text-center">
                  <Icon name="lucide:shopping-basket" class="size-10 text-base-content/25" />
                  <h2 class="mt-3 text-lg font-semibold">{{ search.trim() ? 'No shops match this search' : 'No shops configured' }}</h2>
                  <p class="mt-1 text-base-content/55">{{ search.trim() ? 'Try another name, suburb, city, or type.' : 'Add the first shop and define where and when it operates.' }}</p>
                  <button v-if="!search.trim()" class="btn btn-primary mt-4" @click="openCreate">Add shop</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfigurationDialog :open="editorOpen" :wide="true" :title="editingId ? 'Edit shop' : 'Add shop'" description="Configure the complete directory record used by BuyForMe operations." @close="closeEditor">
      <form class="space-y-7" @submit.prevent="saveShop">
        <section><h3 class="mb-3 font-bold">Identity and location</h3><div class="mb-4 flex flex-col gap-4 rounded-box border border-base-300 bg-base-200/40 p-4 sm:flex-row sm:items-center"><div class="avatar"><div class="grid size-20 place-items-center overflow-hidden rounded-box border border-base-300 bg-base-100 text-primary"><img v-if="logoPreview" :src="logoPreview" alt="Shop logo preview" class="h-full w-full object-contain p-2"><Icon v-else name="lucide:image-plus" class="size-7 opacity-50" /></div></div><fieldset class="fieldset grow"><legend class="fieldset-legend">Shop logo</legend><input :key="logoInputKey" type="file" class="file-input w-full" accept="image/jpeg,image/png,image/webp" :disabled="isOptimizingLogo || isSaving" @change="onLogoSelected"><p class="label">JPEG, PNG or WebP. It will be resized to 512px and stored as WebP.</p></fieldset><span v-if="isOptimizingLogo" class="loading loading-spinner loading-md" aria-label="Optimizing logo" /></div><div class="grid gap-4 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Shop name</legend><input v-model="form.name" class="input w-full" required placeholder="Avondale Grocer"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">URL slug</legend><input v-model="form.slug" class="input w-full" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="Generated from the name"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Country</legend><select v-model="form.country_id" class="select w-full" required><option v-for="country in countries" :key="country.id" :value="country.id">{{ country.name }}</option></select></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">City</legend><select v-model="form.city_id" class="select w-full" required><option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option></select></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Suburb</legend><input v-model="form.suburb" class="input w-full" required placeholder="Avondale"></fieldset><fieldset class="fieldset"><legend class="fieldset-legend">Street address</legend><input v-model="form.street_address" class="input w-full" required placeholder="12 King George Road"></fieldset></div></section>

        <section class="border-t border-base-300 pt-6"><h3 class="font-bold">Shop types</h3><p class="mb-3 mt-1 text-sm text-base-content/50">Select every relevant type and choose the primary label.</p><div class="grid gap-2 sm:grid-cols-3"><label v-for="type in vendorTypes" :key="type.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 p-3"><input v-model="form.vendor_type_ids" type="checkbox" class="checkbox checkbox-primary checkbox-sm" :value="type.id"><Icon :name="type.icon || 'lucide:store'" class="size-4" /><span class="font-semibold">{{ type.name }}</span></label></div><fieldset class="fieldset mt-3"><legend class="fieldset-legend">Primary type</legend><select v-model="form.primary_vendor_type_id" class="select w-full" required><option v-for="type in vendorTypes.filter(type => form.vendor_type_ids.includes(type.id))" :key="type.id" :value="type.id">{{ type.name }}</option></select></fieldset></section>

        <section class="border-t border-base-300 pt-6"><h3 class="font-bold">Payment acceptance</h3><p class="mb-3 mt-1 text-sm text-base-content/50">Payment methods are available only when they support at least one accepted currency.</p><fieldset class="fieldset"><legend class="fieldset-legend">Accepted currencies</legend><div class="grid gap-2 sm:grid-cols-3"><label v-for="currency in currencies" :key="currency.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 p-3"><input v-model="form.currency_ids" type="checkbox" class="checkbox checkbox-primary checkbox-sm" :value="currency.id"><span class="font-bold">{{ currency.code }}</span><span class="text-xs text-base-content/50">{{ currency.name }}</span></label></div></fieldset><fieldset class="fieldset mt-3"><legend class="fieldset-legend">Accepted payment methods</legend><div class="grid gap-2 sm:grid-cols-3"><label v-for="method in paymentMethods" :key="method.id" :class="['flex items-center gap-3 rounded-field border border-base-300 p-3', compatiblePaymentMethods.some(item => item.id === method.id) ? 'cursor-pointer' : 'cursor-not-allowed opacity-40']"><input v-model="form.payment_method_ids" type="checkbox" class="checkbox checkbox-primary checkbox-sm" :value="method.id" :disabled="!compatiblePaymentMethods.some(item => item.id === method.id)"><Icon :name="method.icon || 'lucide:wallet-cards'" class="size-4" /><span class="font-semibold">{{ method.name }}</span></label></div></fieldset></section>

        <section class="border-t border-base-300 pt-6"><div class="overflow-hidden rounded-box border border-base-300"><div class="flex items-center justify-between gap-5 border-b border-base-300 bg-base-200/40 p-4"><div><h3 class="font-bold">Web crawler catalogue</h3><p class="mt-1 text-sm text-base-content/50">Use current product matches and prices from the Shop Prices API.</p></div><input v-model="form.catalogue_available" type="checkbox" class="toggle toggle-primary" aria-label="Shop is present on the web crawler"></div><div v-if="form.catalogue_available" class="space-y-3 p-4"><fieldset class="fieldset"><legend class="fieldset-legend">Crawler shop</legend><select v-model="form.catalogue_source_slug" class="select w-full" required :disabled="crawlerSourceStatus === 'pending' || !!crawlerSourceError"><option value="" disabled>{{ crawlerSourceStatus === 'pending' ? 'Loading crawler shops…' : 'Select a crawler shop' }}</option><option v-for="source in crawlerSources" :key="source.slug" :value="source.slug">{{ source.name }} · {{ source.product_count.toLocaleString() }} products</option></select></fieldset><div v-if="selectedCrawlerSource" class="alert alert-info alert-soft"><Icon name="lucide:database" /><div><p class="font-semibold">{{ selectedCrawlerSource.name }}</p><p class="text-xs">{{ selectedCrawlerSource.website || 'Crawler source' }} · Prices {{ selectedCrawlerSource.prices_updated_at ? `updated ${new Date(selectedCrawlerSource.prices_updated_at).toLocaleString()}` : 'refresh automatically' }}</p></div></div><div v-if="crawlerSourceError" role="alert" class="alert alert-warning"><Icon name="lucide:triangle-alert" /><span>{{ configurationErrorMessage(crawlerSourceError) }}</span><button type="button" class="btn btn-sm" @click="refreshCrawlerSources()">Retry</button></div></div><div v-else class="flex items-center gap-3 p-4 text-sm text-base-content/60"><Icon name="lucide:calculator" class="size-5" /><span>Customers will enter manual price estimates for this shop.</span></div></div></section>

        <section class="border-t border-base-300 pt-6"><div class="mb-3 flex items-end justify-between gap-4"><div><h3 class="font-bold">Operating hours</h3><p class="mt-1 text-sm text-base-content/50">Closing before opening creates an overnight window.</p></div></div><div class="overflow-hidden rounded-box border border-base-300"><div v-for="day in form.operating_hours" :key="day.day_of_week" class="grid items-center gap-3 border-b border-base-300 p-3 last:border-b-0 sm:grid-cols-[8rem_1fr_1fr_auto]"><span class="font-semibold">{{ days[day.day_of_week] }}</span><input v-model="day.opens_at" type="time" class="input input-sm w-full" :disabled="day.is_closed" :required="!day.is_closed"><input v-model="day.closes_at" type="time" class="input input-sm w-full" :disabled="day.is_closed" :required="!day.is_closed"><label class="flex items-center gap-2 text-sm"><input v-model="day.is_closed" type="checkbox" class="toggle toggle-sm" @change="setDayClosed(day)">Closed</label></div></div></section>

        <section class="grid gap-4 border-t border-base-300 pt-6 sm:grid-cols-2"><fieldset class="fieldset"><legend class="fieldset-legend">Sort order</legend><input v-model.number="form.sort_order" class="input w-full" type="number" min="0"></fieldset><label class="mt-7 flex items-center justify-between rounded-field border border-base-300 px-4"><span><span class="block text-sm font-semibold">Active</span><span class="text-xs text-base-content/45">Available to BuyForMe clients</span></span><input v-model="form.active" type="checkbox" class="toggle toggle-success"></label></section>

        <ConfigurationDialogActions><button type="button" class="btn btn-ghost" :disabled="isSaving" @click="closeEditor">Cancel</button><button class="btn btn-primary" :disabled="isSaving || isOptimizingLogo || !form.vendor_type_ids.length || !form.primary_vendor_type_id || !form.currency_ids.length || !form.payment_method_ids.length || (form.catalogue_available && (!form.catalogue_source_slug || !!crawlerSourceError))"><span v-if="isSaving" class="loading loading-spinner loading-sm" />Save shop</button></ConfigurationDialogActions>
      </form>
    </ConfigurationDialog>
  </section>
</template>
