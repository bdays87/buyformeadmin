import type { CurrencyRecord } from '~/types/finance'

export interface VehicleTypeRecord {
  id: number
  name: string
  icon: string
  active: boolean
  sort_order: number
  delivery_rates_count?: number
}

export interface DeliveryRateRecord {
  id: number
  vehicle_type_id: number
  vehicle_type: Pick<VehicleTypeRecord, 'id' | 'name' | 'icon'>
  lower_mileage: string
  upper_mileage: string | null
  currency_id: number
  currency: Pick<CurrencyRecord, 'id' | 'code' | 'name' | 'symbol' | 'decimal_places'>
  amount: string
  active: boolean
  sort_order: number
}
