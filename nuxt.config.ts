import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/fonts', '@nuxt/icon/module', '@nuxt/image', '@pinia/nuxt', '@pinia/colada-nuxt', 'nuxt-auth-sanctum'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8001'
    }
  },
  sanctum: {
    baseUrl: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8001',
    mode: 'token',
    endpoints: {
      login: '/api/v1/auth/login',
      logout: '/api/v1/auth/logout',
      user: '/api/v1/me'
    },
    redirectIfAuthenticated: true,
    redirectIfUnauthenticated: true,
    redirect: {
      keepRequestedRoute: true,
      onLogin: '/admin',
      onLogout: '/',
      onAuthOnly: '/',
      onGuestOnly: '/admin'
    }
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss() as any]
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
