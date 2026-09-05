import { readdirSync } from 'node:fs'

const docsRoutes = readdirSync(new URL('./content/docs', import.meta.url), { recursive: true, encoding: 'utf8' })
  .filter(path => path.endsWith('.md'))
  .map((path) => {
    const segments = path
      .replaceAll('\\', '/')
      .replace(/\.md$/, '')
      .split('/')
      .map(segment => segment.replace(/^\d+\./, ''))
    if (segments.at(-1) === 'index') segments.pop()
    return `/docs${segments.length ? `/${segments.join('/')}` : ''}`
  })
  .sort()

export default defineNuxtConfig({
  compatibilityDate: '2026-09-02',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@nuxt/content'],
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
  runtimeConfig: {
    cloudflareOAuthClientId: '',
    cloudflareOAuthClientSecret: '',
    cloudflareOAuthScopes: [
      'd1.read',
      'd1.write',
      'containers.read',
      'containers.write',
      'workers-kv-storage.read',
      'workers-kv-storage.write',
      'workers-r2.read',
      'workers-r2.write',
      'workers-scripts.read',
      'workers-scripts.write',
      'account-settings.read',
      'memberships.read',
      'zone.read',
      'zone-settings.read',
      'zone-settings.write',
      'dns.read',
      'dns.write',
      'email-routing-rule.read',
      'email-routing-rule.write',
      'email-sending.read',
      'email-sending.write',
    ].join(' '),
    installerSessionPassword: '',
    installerOrigin: 'https://discoflare.com',
    installerManifestUrl: 'https://github.com/vnmtvlv/discoflare/releases/latest/download/discoflare-cloudflare-manifest.json',
  },
  nitro: {
    preset: 'cloudflare-module',
    cloudflare: {
      nodeCompat: true,
      deployConfig: false,
    },
    routeRules: {
      '/api/**': {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        },
      },
    },
    prerender: {
      crawlLinks: false,
      routes: docsRoutes,
    },
  },
  routeRules: {
    '/': { prerender: true },
    '/docs': { prerender: true },
    '/docs/**': { prerender: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
  },
  typescript: {
    strict: true,
  },
})
