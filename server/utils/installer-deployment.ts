import type { H3Event } from 'h3'
import {
  cloudflareClient,
  deployDiscoflare,
  installerErrorMessage,
  loadDiscoflareRelease,
  parseDeployRequest,
} from '@discoflare/installer-core'
import type { DeployProgressReporter, DeployProgressStep, DeployRequest, DeployResponse } from '../../shared/installer'
import { installerConfig } from './installer-config'
import { requireCloudflareToken } from './installer-session'
import { recordInstallerDeployment } from './telemetry-registry'

export function deploymentErrorMessage(cause: unknown) {
  return installerErrorMessage(cause)
}

export async function runInstallerDeployment(
  event: H3Event,
  value: unknown,
  report?: DeployProgressReporter,
  providedAccessToken?: string,
): Promise<DeployResponse> {
  const request = parseDeployRequest(value)
  const progress = async (step: DeployProgressStep, state: 'active' | 'complete', detail?: string) => {
    await report?.({ type: 'progress', step, state, detail })
  }

  const accessToken = providedAccessToken || await requireCloudflareToken(event)
  await progress('account', 'active')
  const client = cloudflareClient(accessToken)
  const account = await client.accounts.get({ account_id: request.accountId })
  if (account.id !== request.accountId) throw createError({ statusCode: 403, statusMessage: 'Cloudflare account is unavailable' })
  if (request.customDomainEnabled || request.mailEnabled) {
    const zone = await client.zones.get({ zone_id: request.zoneId })
    if (zone.id !== request.zoneId || zone.name !== request.zoneName || zone.account?.id !== request.accountId) {
      throw createError({ statusCode: 403, statusMessage: 'Cloudflare domain is unavailable in this account' })
    }
  }
  await progress('account', 'complete', account.name || undefined)

  await progress('release', 'active')
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
  await progress('release', 'complete', `Discoflare ${release.manifest.version}`)

  const deployed = await deployDiscoflare(client, accessToken, request, release, report)
  try {
    await recordInstallerDeployment(event, {
      ...deployed.telemetry,
      accountId: request.accountId,
      workerName: request.workerName,
      version: deployed.version,
      email: request.mailEnabled,
      huddles: request.realtimekitEnabled,
    })
  }
  catch (error) {
    console.warn('Discoflare installed, but anonymous installation telemetry could not be recorded', error)
  }
  const { telemetry: _telemetry, ...response } = deployed
  return response
}
