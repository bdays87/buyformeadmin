export interface AdminSubmodule {
  id: number
  name: string
  icon: string | null
  url: string
  permission: string
}

export interface AdminModule {
  id: number
  name: string
  icon: string | null
  permission: string
  submodules: AdminSubmodule[]
}

export interface AdminAccountType {
  id: number
  code: string
  name: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  gender: string | null
  date_of_birth: string | null
  roles: string[]
  permissions: string[]
  account_types: AdminAccountType[]
  modules: AdminModule[]
}

export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
  statusCode: number
}
