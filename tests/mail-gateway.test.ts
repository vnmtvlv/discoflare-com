import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { DISCOFLARE_MAIL_GATEWAY_SOURCE } from '../server/utils/discoflare-mail-gateway-source'

type GatewayHandler = {
  fetch: (request: Request, env: Record<string, unknown>) => Promise<Response>
  email: (message: Record<string, unknown>, env: Record<string, unknown>) => Promise<void>
}

async function gateway(): Promise<GatewayHandler> {
  const source = Buffer.from(DISCOFLARE_MAIL_GATEWAY_SOURCE).toString('base64')
  return (await import(`data:text/javascript;base64,${source}`)).default as GatewayHandler
}

async function tokenHash(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function route(token = 'workspace-secret') {
  return {
    domain: 'dev1.example.com',
    workerName: 'discoflare-dev1',
    serviceBinding: 'WORKSPACE_DEV1',
    secretBinding: 'MAIL_TOKEN_DEV1',
    tokenHash: await tokenHash(token),
  }
}

describe('Discoflare zone mail gateway Worker', () => {
  it('routes inbound MIME by domain and leaves mailbox lookup to the workspace', async () => {
    const handler = await gateway()
    const fetch = vi.fn(async (request: Request) => {
      expect(request.url).toBe('https://discoflare-workspace.internal/.discoflare/mail/inbound')
      expect(request.headers.get('Authorization')).toBe('Bearer workspace-secret')
      expect(request.headers.get('X-Discoflare-Mail-To')).toBe('support@dev1.example.com')
      expect(await request.text()).toBe('raw MIME')
      return new Response(null, { status: 202 })
    })
    const setReject = vi.fn()
    await handler.email({
      from: 'person@example.net',
      to: 'support@dev1.example.com',
      raw: new Response('raw MIME').body,
      setReject,
    }, {
      MAIL_ROUTES: JSON.stringify([await route()]),
      MAIL_TOKEN_DEV1: 'workspace-secret',
      WORKSPACE_DEV1: { fetch },
    })
    expect(fetch).toHaveBeenCalledOnce()
    expect(setReject).not.toHaveBeenCalled()
  })

  it('propagates an unknown mailbox rejection from the workspace', async () => {
    const handler = await gateway()
    const setReject = vi.fn()
    await handler.email({
      from: 'person@example.net',
      to: 'missing@dev1.example.com',
      raw: new Response('raw MIME').body,
      setReject,
    }, {
      MAIL_ROUTES: JSON.stringify([await route()]),
      MAIL_TOKEN_DEV1: 'workspace-secret',
      WORKSPACE_DEV1: { fetch: async () => new Response('Unknown Discoflare mailbox', { status: 404 }) },
    })
    expect(setReject).toHaveBeenCalledWith('Unknown Discoflare mailbox')
  })

  it('brokers outbound mail only for the token registered to its sender domain', async () => {
    const handler = await gateway()
    const send = vi.fn(async () => ({ messageId: 'message-1' }))
    const response = await handler.fetch(new Request('https://gateway.internal/v1/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer workspace-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { email: 'support@dev1.example.com', name: 'Support' },
        to: ['person@example.net'],
        subject: 'Hello',
        text: 'World',
      }),
    }), {
      MAIL_ROUTES: JSON.stringify([await route()]),
      MAIL_EMAIL: { send },
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ messageId: 'message-1' })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: { email: 'support@dev1.example.com', name: 'Support' },
      to: ['person@example.net'],
    }))
  })

  it('prevents a workspace from sending as another registered domain', async () => {
    const handler = await gateway()
    const send = vi.fn()
    const response = await handler.fetch(new Request('https://gateway.internal/v1/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer workspace-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'admin@hq.example.com', to: 'person@example.net', subject: 'Nope', text: 'Nope' }),
    }), {
      MAIL_ROUTES: JSON.stringify([await route()]),
      MAIL_EMAIL: { send },
    })
    expect(response.status).toBe(403)
    expect(send).not.toHaveBeenCalled()
  })

  it('drops envelope and control headers supplied by a workspace', async () => {
    const handler = await gateway()
    const send = vi.fn(async () => ({ messageId: 'message-2' }))
    const response = await handler.fetch(new Request('https://gateway.internal/v1/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer workspace-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'support@dev1.example.com',
        to: 'person@example.net',
        subject: 'Reply',
        text: 'World',
        headers: {
          From: 'admin@hq.example.com',
          References: '<safe@example.net>',
          'X-Custom': 'not forwarded',
        },
      }),
    }), {
      MAIL_ROUTES: JSON.stringify([await route()]),
      MAIL_EMAIL: { send },
    })
    expect(response.status).toBe(200)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'support@dev1.example.com',
      headers: { References: '<safe@example.net>' },
    }))
  })
})
