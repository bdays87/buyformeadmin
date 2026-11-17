import type { AdminUser, ApiResponse } from '~/types/auth'

type AdminIdentity = AdminUser | ApiResponse<AdminUser>

const isApiResponse = (identity: AdminIdentity): identity is ApiResponse<AdminUser> =>
  'data' in identity

export const useAdminAuth = () => {
  const auth = useSanctumAuth<AdminIdentity>()

  const currentUser = computed<AdminUser | null>(() => {
    const identity = auth.user.value

    if (!identity) {
      return null
    }

    return isApiResponse(identity) ? identity.data : identity
  })

  return {
    ...auth,
    currentUser
  }
}
