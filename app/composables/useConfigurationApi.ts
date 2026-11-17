import type { ApiResponse } from '~/types/auth'

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const useConfigurationApi = () => {
  const client = useSanctumClient()

  const get = async <T>(url: string) => {
    const response = await client<ApiResponse<T>>(url)
    return response.data
  }

  const mutate = async <T>(url: string, method: Method, body?: Record<string, unknown> | FormData) => {
    const response = await client<ApiResponse<T>>(url, { method, body })
    return response.data
  }

  return { get, mutate }
}

export const configurationErrorMessage = (error: unknown) => {
  const candidate = error as {
    data?: { message?: string, data?: Record<string, string[] | string> }
    message?: string
  }
  const validation = candidate.data?.data

  if (validation) {
    const first = Object.values(validation).flat()[0]
    if (typeof first === 'string') return first
  }

  return candidate.data?.message || candidate.message || 'The request could not be completed.'
}
