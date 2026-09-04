import type { DeployRequest, DeployResponse } from '../../../shared/installer'
import { cloudflareClient } from '../../utils/cloudflare-client'
import { deployDiscoflare } from '../../utils/discoflare-deploy'
import { installerConfig } from '../../utils/installer-config'
import { loadDiscoflareRelease } from '../../utils/discoflare-release'
import { requireCloudflareToken } from '../../utils/installer-session'
import { assertInstallerMutation } from '../../utils/installer-security'

function parseRequest(value: unknown): DeployRequest {
  const body = value as Partial<DeployRequest> | null
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'Invalid deploy request' })
  const accountId = String(body.accountId || '').trim()
  const workerName = String(body.workerName || '').trim().toLowerCase()
  const appName = String(body.appName || '').trim()
  if (!/^[0-9a-f]{32}$/.test(accountId)) throw createError({ statusCode: 400, statusMessage: 'Select a Cloudflare account' })
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workerName)) {
    throw createError({ statusCode: 400, statusMessage: 'Worker name must use lowercase letters, numbers, and hyphens' })
  }
  if (!appName || appName.length > 80) throw createError({ statusCode: 400, statusMessage: 'App name must be 1–80 characters' })
  if (body.registrationMode !== 'invite_only' && body.registrationMode !== 'open') {
    throw createError({ statusCode: 400, statusMessage: 'Select a registration mode' })
  }
  return {
    accountId,
    workerName,
    appName,
    registrationMode: body.registrationMode,
    adminEmail: String(body.adminEmail || '').trim().toLowerCase().slice(0, 254),
    adminPassword: String(body.adminPassword || '').slice(0, 256),
    adminName: String(body.adminName || '').trim().slice(0, 80),
  }
}

export default defineEventHandler(async (event): Promise<DeployResponse> => {
  assertInstallerMutation(event)
  const request = parseRequest(await readBody(event))
  const accessToken = await requireCloudflareToken(event)
  const client = cloudflareClient(accessToken)

  const account = await client.accounts.get({ account_id: request.accountId })
  if (account.id !== request.accountId) throw createError({ statusCode: 403, statusMessage: 'Cloudflare account is unavailable' })

  const manifestUrl = installerConfig(event).installerManifestUrl
  if (typeof manifestUrl !== 'string' || !manifestUrl.startsWith('https://')) {
    throw createError({ statusCode: 503, statusMessage: 'Discoflare release source is not configured' })
  }
  const release = await loadDiscoflareRelease(manifestUrl)
  return deployDiscoflare(client, accessToken, request, release)
})
