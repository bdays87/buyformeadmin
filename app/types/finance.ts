export interface CurrencyRecord {
  id: number
  code: string
  name: string
  symbol: string
  decimal_places: number
  active: boolean
  is_default: boolean
  sort_order: number
  payment_methods_count?: number
}

export interface PaymentMethodRecord {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  active: boolean
  sort_order: number
  currencies: CurrencyRecord[]
}
