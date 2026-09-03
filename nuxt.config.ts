export default defineNuxtConfig({
  compatibilityDate: '2026-09-02',
  devtools: { enabled: false },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  icon: {
    serverBundle: {
      collections: ['ph'],
    },
  },
  app: {
    head: {
      title: 'Discoflare — Team chat on your Cloudflare account',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f6821f' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  routeRules: {
    '/**': { prerender: true },
  },
  typescript: {
    strict: true,
  },
})
