import { CLOUDFLARE_AUTH_URL, oauthConfig, randomBase64Url, sha256Base64Url } from '../../../utils/cloudflare-oauth'
import { useInstallerSession } from '../../../utils/installer-session'

export default defineEventHandler(async (event) => {
  const config = oauthConfig(event)
  const verifier = randomBase64Url(48)
  const state = randomBase64Url(32)
  const query = getQuery(event)
  const returnTo = typeof query.returnTo === 'string' && query.returnTo.startsWith('/') && !query.returnTo.startsWith('//')
    ? query.returnTo
    : '/deploy'

  const session = await useInstallerSession(event)
  await session.update({ oauthPending: { state, verifier, returnTo } })

  const url = new URL(CLOUDFLARE_AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', config.scopes)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', await sha256Base64Url(verifier))
  url.searchParams.set('code_challenge_method', 'S256')
  return sendRedirect(event, url.toString())
})
