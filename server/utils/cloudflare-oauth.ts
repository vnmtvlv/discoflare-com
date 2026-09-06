import type { H3Event } from 'h3'
import { installerConfig } from './installer-config'

export const CLOUDFLARE_AUTH_URL = 'https://dash.cloudflare.com/oauth2/auth'
export const CLOUDFLARE_TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token'
export const CLOUDFLARE_REVOKE_URL = 'https://dash.cloudflare.com/oauth2/revoke'
export const CLOUDFLARE_OAUTH_SCOPES = [
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
  'access:read',
  'access:write',
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
].join(' ')

export function installerOrigin(event: H3Event) {
  const origin = installerConfig(event).installerOrigin
  try {
    return new URL(origin).origin
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: 'Cloudflare installer origin is invalid' })
  }
}

export function oauthConfig(event: H3Event) {
  const config = installerConfig(event)
  const clientId = config.cloudflareOAuthClientId
  const clientSecret = config.cloudflareOAuthClientSecret
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Cloudflare OAuth is not configured' })
  }
  return {
    clientId,
    clientSecret,
    scopes: CLOUDFLARE_OAUTH_SCOPES,
    redirectUri: `${installerOrigin(event)}/api/cloudflare/oauth/callback`,
  }
}

export function randomBase64Url(bytes = 32) {
  const value = new Uint8Array(bytes)
  crypto.getRandomValues(value)
  return bytesToBase64Url(value)
}

export async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

export function oauthBasicAuth(clientId: string, clientSecret: string) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`
}

function bytesToBase64Url(value: Uint8Array) {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
