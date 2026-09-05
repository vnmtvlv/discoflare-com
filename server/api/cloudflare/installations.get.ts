import type { CloudflareInstallation } from '../../../shared/installer'
import { findDiscoflareInstallations } from '../../utils/discoflare-installations'
import { requireCloudflareToken } from '../../utils/installer-session'

export default defineEventHandler(async (event): Promise<{ installations: CloudflareInstallation[] }> => {
  setHeader(event, 'Cache-Control', 'no-store')
  const accessToken = await requireCloudflareToken(event)
  return { installations: await findDiscoflareInstallations(accessToken, getQuery(event).origin) }
})
