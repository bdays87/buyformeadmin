export interface ShoppingAssistantTypeRecord {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  active: boolean
  is_core: boolean
  can_shop: boolean
  can_deliver: boolean
  uses_personal_funds: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
