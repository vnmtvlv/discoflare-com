import type { CloudflareAccount, InstallerSessionResponse } from '../../../shared/installer'
import { cloudflareClient } from '../../utils/cloudflare-client'
import { useInstallerSession } from '../../utils/installer-session'

export default defineEventHandler(async (event): Promise<InstallerSessionResponse> => {
  const session = await useInstallerSession(event)
  const authorized = session.data.cloudflare
  if (!authorized || authorized.expiresAt <= Date.now()) {
    if (authorized) await session.clear()
    return { connected: false, accounts: [] }
  }

  try {
    const client = cloudflareClient(authorized.accessToken)
    const accounts: CloudflareAccount[] = []
    for await (const account of client.accounts.list({ per_page: 50 })) {
      accounts.push({ id: account.id, name: account.name, type: account.type })
    }
    return { connected: true, accounts }
  }
  catch {
    await session.clear()
    return { connected: false, accounts: [] }
  }
})
