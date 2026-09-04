import type { H3Event } from 'h3'

type InstallerBindings = Partial<Record<
  | 'NUXT_CLOUDFLARE_OAUTH_CLIENT_ID'
  | 'NUXT_CLOUDFLARE_OAUTH_CLIENT_SECRET'
  | 'NUXT_CLOUDFLARE_OAUTH_SCOPES'
  | 'NUXT_INSTALLER_SESSION_PASSWORD'
  | 'NUXT_INSTALLER_ORIGIN'
  | 'NUXT_INSTALLER_MANIFEST_URL',
  string
>>

function bindings(event: H3Event): InstallerBindings {
  const context = event.context as typeof event.context & {
    cloudflare?: { env?: InstallerBindings }
  }
  return context.cloudflare?.env || {}
}

export function installerConfig(event: H3Event) {
  const runtime = useRuntimeConfig(event)
  const env = bindings(event)

  return {
    cloudflareOAuthClientId: env.NUXT_CLOUDFLARE_OAUTH_CLIENT_ID || runtime.cloudflareOAuthClientId,
    cloudflareOAuthClientSecret: env.NUXT_CLOUDFLARE_OAUTH_CLIENT_SECRET || runtime.cloudflareOAuthClientSecret,
    cloudflareOAuthScopes: env.NUXT_CLOUDFLARE_OAUTH_SCOPES || runtime.cloudflareOAuthScopes,
    installerSessionPassword: env.NUXT_INSTALLER_SESSION_PASSWORD || runtime.installerSessionPassword,
    installerOrigin: env.NUXT_INSTALLER_ORIGIN || runtime.installerOrigin,
    installerManifestUrl: env.NUXT_INSTALLER_MANIFEST_URL || runtime.installerManifestUrl,
  }
}
