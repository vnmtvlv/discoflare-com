import type Cloudflare from 'cloudflare'
import type { DeployRequest } from '../../shared/installer'
import { DISCOFLARE_MAIL_GATEWAY_SOURCE } from './discoflare-mail-gateway-source'
import { randomBase64Url } from './cloudflare-oauth'
import { cloudflareApi } from './cloudflare-client'

type GatewayBinding = {
  name: string
  type: string
  text?: string
  service?: string
}

export type MailGatewayRoute = {
  domain: string
  workerName: string
  serviceBinding: string
  secretBinding: string
  tokenHash: string
}

type GatewayState = {
  exists: boolean
  routes: MailGatewayRoute[]
  zoneId?: string
  zoneName?: string
}

export type MailGatewayProvision = {
  name: string
  token?: string
}

export const mailGatewayMarker = 'discoflare.com/mail-gateway/v1'

function statusCode(error: unknown) {
  if (!error || typeof error !== 'object') return 0
  const value = error as { status?: unknown, statusCode?: unknown }
  return Number(value.statusCode || value.status || 0)
}

function mailDomain(request: DeployRequest) {
  return `${request.mailSubdomain}.${request.zoneName}`
}

export function mailGatewayName(zoneId: string) {
  return `discoflare-mail-${zoneId}`
}

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function routeBindingNames(workerName: string) {
  const suffix = (await sha256(workerName)).slice(0, 16).toUpperCase()
  return {
    serviceBinding: `WORKSPACE_${suffix}`,
    secretBinding: `MAIL_TOKEN_${suffix}`,
  }
}

function parseRoutes(value: string | undefined): MailGatewayRoute[] {
  if (!value) return []
  try {
    const routes = JSON.parse(value) as unknown
    if (!Array.isArray(routes)) throw new Error()
    return routes.map((item) => {
      const route = item as Partial<MailGatewayRoute>
      if (!route.domain || !route.workerName || !route.serviceBinding || !route.secretBinding || !/^[0-9a-f]{64}$/u.test(route.tokenHash || '')) throw new Error()
      return route as MailGatewayRoute
    })
  }
  catch {
    throw createError({ statusCode: 409, statusMessage: 'The Discoflare mail gateway route registry is invalid' })
  }
}

async function inspectGateway(client: Cloudflare, accountId: string, name: string): Promise<GatewayState> {
  try {
    const settings = await client.workers.scripts.scriptAndVersionSettings.get(name, { account_id: accountId })
    const bindings = settings.bindings as GatewayBinding[] || []
    const marker = bindings.find(binding => binding.name === 'DISCOFLARE_MAIL_GATEWAY' && binding.type === 'plain_text')?.text
    if (marker !== mailGatewayMarker) {
      throw createError({ statusCode: 409, statusMessage: `A non-Discoflare Worker named ${name} already exists` })
    }
    const routes = bindings.find(binding => binding.name === 'MAIL_ROUTES' && binding.type === 'plain_text')?.text
    return {
      exists: true,
      routes: parseRoutes(routes),
      zoneId: bindings.find(binding => binding.name === 'MAIL_ZONE_ID' && binding.type === 'plain_text')?.text,
      zoneName: bindings.find(binding => binding.name === 'MAIL_ZONE_NAME' && binding.type === 'plain_text')?.text,
    }
  }
  catch (error) {
    if (statusCode(error) === 404) return { exists: false, routes: [] }
    throw error
  }
}

async function uploadGateway(
  accessToken: string,
  accountId: string,
  request: DeployRequest,
  compatibilityDate: string,
  state: GatewayState,
  routes: MailGatewayRoute[],
  newSecret?: { name: string, value: string },
) {
  const name = mailGatewayName(request.zoneId)
  const bindings: Array<Record<string, unknown>> = [
    { type: 'plain_text', name: 'DISCOFLARE_MAIL_GATEWAY', text: mailGatewayMarker },
    { type: 'plain_text', name: 'MAIL_ZONE_ID', text: request.zoneId },
    { type: 'plain_text', name: 'MAIL_ZONE_NAME', text: request.zoneName },
    { type: 'plain_text', name: 'MAIL_ROUTES', text: JSON.stringify(routes) },
    { type: 'send_email', name: 'MAIL_EMAIL' },
    ...routes.map(route => ({ type: 'service', name: route.serviceBinding, service: route.workerName })),
  ]
  if (newSecret) bindings.push({ type: 'secret_text', name: newSecret.name, text: newSecret.value })
  const metadata: Record<string, unknown> = {
    main_module: 'discoflare-mail-gateway.mjs',
    compatibility_date: compatibilityDate,
    compatibility_flags: ['nodejs_compat'],
    bindings,
    observability: { enabled: true },
    annotations: {
      'workers/message': `Discoflare zone mail gateway for ${request.zoneName}`,
      'workers/tag': 'discoflare-mail-gateway-v1',
    },
  }
  if (state.exists) metadata.keep_bindings = ['secret_text']
  const form = new FormData()
  form.append('metadata', JSON.stringify(metadata))
  form.append('discoflare-mail-gateway.mjs', new Blob([DISCOFLARE_MAIL_GATEWAY_SOURCE], { type: 'application/javascript+module' }), 'discoflare-mail-gateway.mjs')
  await cloudflareApi(
    accessToken,
    `/accounts/${accountId}/workers/scripts/${name}?excludeScript=true&bindings_inherit=strict`,
    { method: 'PUT', body: form },
  )
}

export async function ensureMailGateway(
  client: Cloudflare,
  accessToken: string,
  request: DeployRequest,
  compatibilityDate: string,
  preserveWorkspaceToken: boolean,
): Promise<MailGatewayProvision> {
  const name = mailGatewayName(request.zoneId)
  const state = await inspectGateway(client, request.accountId, name)
  if (state.exists && (state.zoneId !== request.zoneId || state.zoneName !== request.zoneName)) {
    throw createError({ statusCode: 409, statusMessage: `Discoflare mail gateway ${name} belongs to another zone` })
  }
  const domain = mailDomain(request)
  const current = state.routes.find(route => route.domain === domain)
  if (current && current.workerName !== request.workerName) {
    throw createError({ statusCode: 409, statusMessage: `${domain} is already registered to Discoflare Worker ${current.workerName}` })
  }
  const duplicate = state.routes.find(route => route.workerName === request.workerName && route.domain !== domain)
  if (duplicate) {
    throw createError({ statusCode: 409, statusMessage: `Discoflare Worker ${request.workerName} is already registered for ${duplicate.domain}` })
  }

  const names = await routeBindingNames(request.workerName)
  const rotateToken = !current || !preserveWorkspaceToken
  const token = rotateToken ? randomBase64Url(32) : undefined
  const route: MailGatewayRoute = {
    domain,
    workerName: request.workerName,
    ...names,
    tokenHash: token ? await sha256(token) : current!.tokenHash,
  }
  const routes = [...state.routes.filter(item => item.domain !== domain), route].sort((left, right) => left.domain.localeCompare(right.domain))
  await uploadGateway(
    accessToken,
    request.accountId,
    request,
    compatibilityDate,
    state,
    routes,
    token ? { name: route.secretBinding, value: token } : undefined,
  )
  await client.workers.scripts.subdomain.create(name, {
    account_id: request.accountId,
    enabled: false,
    previews_enabled: false,
  })
  return { name, token }
}

export async function removeMailGatewayRoute(
  client: Cloudflare,
  accessToken: string,
  accountId: string,
  zoneId: string,
  zoneName: string,
  workerName: string,
  domain: string,
) {
  const request = { accountId, zoneId, zoneName } as DeployRequest
  const name = mailGatewayName(zoneId)
  const state = await inspectGateway(client, accountId, name)
  if (!state.exists) return { gatewayName: name, lastRoute: true, removed: false }
  const route = state.routes.find(item => item.domain === domain && item.workerName === workerName)
  if (!route) return { gatewayName: name, lastRoute: state.routes.length === 0, removed: false }
  const routes = state.routes.filter(item => item !== route)
  if (!routes.length) {
    await client.workers.scripts.delete(name, { account_id: accountId, force: true })
    return { gatewayName: name, lastRoute: true, removed: true }
  }
  await uploadGateway(accessToken, accountId, request, new Date().toISOString().slice(0, 10), state, routes)
  try {
    await client.workers.scripts.secrets.delete(route.secretBinding, { account_id: accountId, script_name: name })
  }
  catch (error) {
    if (statusCode(error) !== 404) throw error
  }
  return { gatewayName: name, lastRoute: false, removed: true }
}
