import type { CityRecord, CountryRecord } from './coverage'
import type { CurrencyRecord, PaymentMethodRecord } from './finance'
import type { VendorTypeRecord } from './vendor'

export interface ShopOperatingHour {
  id?: number
  day_of_week: number
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}

export interface ShopRecord {
  id: number
  name: string
  slug: string
  logo_url: string | null
  catalogue_available: boolean
  catalogue_source_slug: string | null
  catalogue_source_name: string | null
  catalogue_source_url: string | null
  catalogue_prices_updated_at: string | null
  country_id: number
  city_id: number
  primary_vendor_type_id: number
  suburb: string
  street_address: string
  active: boolean
  sort_order: number
  country: CountryRecord
  city: CityRecord
  primary_vendor_type: VendorTypeRecord
  vendor_types: VendorTypeRecord[]
  currencies: CurrencyRecord[]
  payment_methods: PaymentMethodRecord[]
  operating_hours: ShopOperatingHour[]
}

export interface CrawlerCatalogueSource {
  slug: string
  name: string
  type: string
  branch?: string | null
  website?: string | null
  currency: string
  product_count: number
  prices_updated_at?: string | null
}
