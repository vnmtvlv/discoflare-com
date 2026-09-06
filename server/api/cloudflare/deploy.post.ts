import type { DeployRequest, DeployResponse } from '../../../shared/installer'
import { cloudflareClient } from '../../utils/cloudflare-client'
import { deployDiscoflare } from '../../utils/discoflare-deploy'
import { installerConfig } from '../../utils/installer-config'
import { loadDiscoflareRelease } from '../../utils/discoflare-release'
import { requireCloudflareToken } from '../../utils/installer-session'
import { assertInstallerMutation } from '../../utils/installer-security'
import { recordInstallerDeployment } from '../../utils/telemetry-registry'

function parseRequest(value: unknown): DeployRequest {
  const body = value as Partial<DeployRequest> | null
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'Invalid deploy request' })
  const accountId = String(body.accountId || '').trim()
  const workerName = String(body.workerName || '').trim().toLowerCase()
  const appName = String(body.appName || '').trim()
  const authMode = body.authMode === 'builtin' ? 'builtin' : 'access'
  const customDomainEnabled = body.customDomainEnabled === true
  const zoneId = String(body.zoneId || '').trim()
  const zoneName = String(body.zoneName || '').trim().toLowerCase()
  const appSubdomain = String(body.appSubdomain || '').trim().toLowerCase()
  const mailEnabled = body.mailEnabled === true
  const mailSubdomain = String(body.mailSubdomain || '').trim().toLowerCase()
  const mailLocalPart = String(body.mailLocalPart || '').trim().toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(accountId)) throw createError({ statusCode: 400, statusMessage: 'Select a Cloudflare account' })
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workerName)) {
    throw createError({ statusCode: 400, statusMessage: 'Worker name must use lowercase letters, numbers, and hyphens' })
  }
  if (!appName || appName.length > 80) throw createError({ statusCode: 400, statusMessage: 'App name must be 1–80 characters' })
  const zoneRequired = customDomainEnabled || mailEnabled
  if (zoneRequired && !/^[0-9a-f]{32}$/.test(zoneId)) throw createError({ statusCode: 400, statusMessage: 'Select a Cloudflare domain' })
  if (zoneRequired && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(zoneName)) throw createError({ statusCode: 400, statusMessage: 'Invalid Cloudflare domain' })
  if (customDomainEnabled && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(appSubdomain)) throw createError({ statusCode: 400, statusMessage: 'App subdomain must use lowercase letters, numbers, and hyphens' })
  if (mailEnabled && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(mailSubdomain)) throw createError({ statusCode: 400, statusMessage: 'Email subdomain must use lowercase letters, numbers, and hyphens' })
  if (mailEnabled && !/^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]{0,62}[a-z0-9])?$/.test(mailLocalPart)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid default mailbox' })
  if (authMode === 'builtin' && body.registrationMode !== 'invite_only' && body.registrationMode !== 'open') {
    throw createError({ statusCode: 400, statusMessage: 'Select a registration mode' })
  }
  const adminEmail = String(body.adminEmail || '').trim().toLowerCase().slice(0, 254)
  if (adminEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid owner email' })
  const allowedEmails = authMode === 'access' && Array.isArray(body.allowedEmails)
    ? [...new Set(body.allowedEmails.map(value => String(value).trim().toLowerCase()).filter(Boolean))]
    : []
  if (allowedEmails.length > 20 || allowedEmails.some(email => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
    throw createError({ statusCode: 400, statusMessage: 'Enter at most 20 valid Access member emails' })
  }
  const targetVersion = typeof body.targetVersion === 'string' && /^v?\d+\.\d+\.\d+$/.test(body.targetVersion)
    ? body.targetVersion
    : undefined
  if (body.targetVersion && !targetVersion) throw createError({ statusCode: 400, statusMessage: 'Invalid Discoflare release version' })
  return {
    accountId,
    workerName,
    appName,
    authMode,
    registrationMode: authMode === 'access' ? 'open' : body.registrationMode!,
    adminEmail,
    allowedEmails: allowedEmails.filter(email => email !== adminEmail),
    customDomainEnabled,
    zoneId,
    zoneName,
    appSubdomain,
    mailEnabled,
    mailSubdomain,
    mailLocalPart,
    targetVersion,
  }
}

export default defineEventHandler(async (event): Promise<DeployResponse> => {
  assertInstallerMutation(event)
  const request = parseRequest(await readBody(event))
  const accessToken = await requireCloudflareToken(event)
  const client = cloudflareClient(accessToken)

  const account = await client.accounts.get({ account_id: request.accountId })
  if (account.id !== request.accountId) throw createError({ statusCode: 403, statusMessage: 'Cloudflare account is unavailable' })
  if (request.customDomainEnabled || request.mailEnabled) {
    const zone = await client.zones.get({ zone_id: request.zoneId })
    if (zone.id !== request.zoneId || zone.name !== request.zoneName || zone.account?.id !== request.accountId) {
      throw createError({ statusCode: 403, statusMessage: 'Cloudflare domain is unavailable in this account' })
    }
  }

  const manifestUrl = request.targetVersion
    ? `https://github.com/vnmtvlv/discoflare/releases/download/${request.targetVersion}/discoflare-cloudflare-manifest.json`
    : installerConfig(event).installerManifestUrl
  if (typeof manifestUrl !== 'string' || !manifestUrl.startsWith('https://')) {
    throw createError({ statusCode: 503, statusMessage: 'Discoflare release source is not configured' })
  }
  const release = await loadDiscoflareRelease(manifestUrl)
  if (request.authMode === 'access' && !release.manifest.capabilities?.includes('cloudflare-access-auth')) {
    throw createError({ statusCode: 409, statusMessage: 'This Discoflare release does not support Cloudflare Access authentication yet. Publish a compatible core release or select Discoflare accounts.' })
  }
  if (request.targetVersion && release.manifest.version !== request.targetVersion.replace(/^v/, '')) {
    throw createError({ statusCode: 502, statusMessage: 'Discoflare release manifest version does not match the requested upgrade' })
  }
  const deployed = await deployDiscoflare(client, accessToken, request, release)
  try {
    await recordInstallerDeployment(event, {
      ...deployed.telemetry,
      accountId: request.accountId,
      workerName: request.workerName,
      version: deployed.version,
      email: request.mailEnabled,
    })
  }
  catch (error) {
    console.warn('Discoflare installed, but anonymous installation telemetry could not be recorded', error)
  }
  const { telemetry: _telemetry, ...response } = deployed
  return response
})
