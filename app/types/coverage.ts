export interface CityRecord {
  id: number
  country_id: number
  name: string
  active: boolean
  sort_order: number
}

export interface CountryRecord {
  id: number
  name: string
  code: string
  active: boolean
  sort_order: number
  cities: CityRecord[]
}

export interface BuyForMeTypeRecord {
  id: number
  code: string
  name: string
  description: string | null
  active: boolean
  is_core: boolean
  sort_order: number
}

export interface RouteClassification {
  type: BuyForMeTypeRecord
  destination: CityRecord & { country: CountryRecord }
  shop: CityRecord & { country: CountryRecord }
}
