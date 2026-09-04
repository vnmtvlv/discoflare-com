import { CLOUDFLARE_TOKEN_URL, oauthBasicAuth, oauthConfig } from '../../../utils/cloudflare-oauth'
import { useInstallerSession } from '../../../utils/installer-session'

type TokenResponse = {
  access_token: string
  expires_in?: number
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const session = await useInstallerSession(event)
  const pending = session.data.oauthPending
  const returnTo = pending?.returnTo || '/deploy'

  if (query.error) {
    await session.clear()
    return sendRedirect(event, `${returnTo}?error=${encodeURIComponent(String(query.error))}`)
  }

  if (!pending || typeof query.code !== 'string' || query.state !== pending.state) {
    await session.clear()
    return sendRedirect(event, `${returnTo}?error=oauth_state`)
  }

  const config = oauthConfig(event)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: query.code,
    redirect_uri: config.redirectUri,
    code_verifier: pending.verifier,
  })
  const response = await fetch(CLOUDFLARE_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: oauthBasicAuth(config.clientId, config.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    await session.clear()
    return sendRedirect(event, `${returnTo}?error=oauth_exchange`)
  }

  const token = await response.json() as TokenResponse
  if (!token.access_token) {
    await session.clear()
    return sendRedirect(event, `${returnTo}?error=oauth_token`)
  }

  await session.update({
    oauthPending: undefined,
    cloudflare: {
      accessToken: token.access_token,
      expiresAt: Date.now() + Math.max(60, (token.expires_in || 3600) - 30) * 1000,
    },
  })
  return sendRedirect(event, returnTo)
})
