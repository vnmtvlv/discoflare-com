export const DISCOFLARE_MAIL_GATEWAY_SOURCE = String.raw`
const textEncoder = new TextEncoder()

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function sha256(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', textEncoder.encode(value)))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function equalHash(left, right) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function routes(env) {
  try {
    const value = JSON.parse(env.MAIL_ROUTES || '[]')
    return Array.isArray(value) ? value : []
  }
  catch {
    return []
  }
}

function bearer(request) {
  const value = request.headers.get('Authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7) : ''
}

function address(value) {
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (value && typeof value === 'object' && typeof value.email === 'string') return value.email.trim().toLowerCase()
  return ''
}

function domainOf(value) {
  const normalized = address(value)
  const separator = normalized.lastIndexOf('@')
  return separator > 0 ? normalized.slice(separator + 1) : ''
}

function cleanAddress(value) {
  const email = address(value)
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address')
  if (typeof value === 'string') return email
  const name = typeof value.name === 'string' ? value.name.replace(/[\r\n]/g, ' ').trim().slice(0, 200) : ''
  return { email, name }
}

function cleanRecipients(value) {
  if (value === undefined) return undefined
  const list = Array.isArray(value) ? value : [value]
  return list.map(cleanAddress)
}

function cleanMessage(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid message')
  const to = cleanRecipients(value.to)
  const cc = cleanRecipients(value.cc)
  const bcc = cleanRecipients(value.bcc)
  const count = (to?.length || 0) + (cc?.length || 0) + (bcc?.length || 0)
  if (!count || count > 50) throw new Error('Invalid recipients')
  const subject = typeof value.subject === 'string' ? value.subject.replace(/[\r\n]/g, ' ').trim() : ''
  if (!subject || subject.length > 1000) throw new Error('Invalid subject')
  const headers = value.headers && typeof value.headers === 'object'
    ? Object.fromEntries(Object.entries(value.headers).filter(([key, item]) => ['in-reply-to', 'references'].includes(key.toLowerCase()) && typeof item === 'string' && item.length <= 2000 && !/[\r\n]/.test(item)))
    : undefined
  return {
    from: cleanAddress(value.from),
    ...(to ? { to } : {}),
    ...(cc ? { cc } : {}),
    ...(bcc ? { bcc } : {}),
    ...(value.replyTo ? { replyTo: cleanAddress(value.replyTo) } : {}),
    subject,
    ...(typeof value.text === 'string' ? { text: value.text } : {}),
    ...(typeof value.html === 'string' ? { html: value.html } : {}),
    ...(headers ? { headers } : {}),
  }
}

async function send(request, env) {
  const token = bearer(request)
  if (!token) return json({ error: 'Unauthorized' }, 401)
  const tokenHash = await sha256(token)
  const route = routes(env).find(item => typeof item.tokenHash === 'string' && equalHash(item.tokenHash, tokenHash))
  if (!route) return json({ error: 'Unauthorized' }, 401)
  let message
  try {
    message = cleanMessage(await request.json())
  }
  catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid message' }, 400)
  }
  if (domainOf(message.from) !== route.domain) return json({ error: 'Sender domain is not registered for this workspace' }, 403)
  try {
    const result = await env.MAIL_EMAIL.send(message)
    return json({ messageId: result.messageId })
  }
  catch (error) {
    console.error(JSON.stringify({ event: 'mail_gateway_send_failed', domain: route.domain, error: error instanceof Error ? error.message : String(error) }))
    return json({ error: 'Cloudflare Email Service rejected the message' }, 502)
  }
}

async function receive(message, env) {
  const domain = domainOf(message.to)
  const route = routes(env).find(item => item.domain === domain)
  if (!route) {
    message.setReject('Unknown Discoflare mail domain')
    return
  }
  const target = env[route.serviceBinding]
  const token = env[route.secretBinding]
  if (!target || typeof target.fetch !== 'function' || typeof token !== 'string') throw new Error('Discoflare mail route is incomplete')
  const response = await target.fetch(new Request('https://discoflare-workspace.internal/.discoflare/mail/inbound', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'message/rfc822',
      'X-Discoflare-Mail-From': message.from,
      'X-Discoflare-Mail-To': message.to,
    },
    body: message.raw,
    duplex: 'half',
  }))
  if (response.status === 202) return
  if (response.status === 404) {
    const reason = (await response.text()).slice(0, 200) || 'Unknown Discoflare mailbox'
    message.setReject(reason)
    return
  }
  throw new Error('Workspace mail ingress failed with HTTP ' + response.status)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/v1/send') return send(request, env)
    return new Response('Not found', { status: 404 })
  },
  async email(message, env) {
    await receive(message, env)
  },
}
`
