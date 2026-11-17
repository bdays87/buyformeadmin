export interface PermissionRecord {
  id: number
  submodule_id: number
  name: string
  guard_name: string
}

export interface SubmoduleRecord {
  id: number
  system_module_id: number
  name: string
  icon: string | null
  url: string | null
  permission: string
  status: 'ACTIVE' | 'INACTIVE'
  sort_order: number
  permissions?: PermissionRecord[]
}

export interface SystemModuleRecord {
  id: number
  name: string
  icon: string | null
  permission: string
  status: 'ACTIVE' | 'INACTIVE'
  sort_order: number
  submodules: SubmoduleRecord[]
}

export interface RoleRecord {
  id: number
  name: string
  guard_name: string
  permissions: PermissionRecord[]
}

export interface AccountTypeRecord {
  id: number
  code: string
  name: string
  description: string | null
  active: boolean
  sort_order: number
  roles?: RoleRecord[]
  system_modules?: SystemModuleRecord[]
}

export interface UserRecord {
  id: number
  name: string
  email: string
  gender: string | null
  date_of_birth: string | null
  account_types: AccountTypeRecord[]
  roles: RoleRecord[]
}
