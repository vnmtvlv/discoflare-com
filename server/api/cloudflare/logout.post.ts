import { CLOUDFLARE_REVOKE_URL, oauthBasicAuth, oauthConfig } from '../../utils/cloudflare-oauth'
import { assertInstallerMutation } from '../../utils/installer-security'
import { useInstallerSession } from '../../utils/installer-session'

export default defineEventHandler(async (event) => {
  assertInstallerMutation(event)
  const session = await useInstallerSession(event)
  const token = session.data.cloudflare?.accessToken
  if (token) {
    const config = oauthConfig(event)
    await fetch(CLOUDFLARE_REVOKE_URL, {
      method: 'POST',
      headers: {
        Authorization: oauthBasicAuth(config.clientId, config.clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token }),
    }).catch(() => undefined)
  }
  await session.clear()
  return { ok: true }
})
