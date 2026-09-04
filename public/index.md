# Discoflare

Discoflare is open-source, self-hosted team chat for humans, agents, and tasks. It provides one workspace per deployment and runs in the workspace owner's Cloudflare account without a separate origin server.

## Capabilities

- Public and private channels
- Direct messages
- Replies and threaded conversations
- Reactions, mentions, typing indicators, and presence
- File attachments stored in the workspace owner's R2 bucket
- Member invitations, roles, permissions, and audit history
- Optional voice huddles using Cloudflare RealtimeKit
- Email and password sign-in, with optional X sign-in

Text chat does not require RealtimeKit. Voice huddles remain unavailable until the optional voice integration is configured.

## Architecture

Discoflare deploys as one Nuxt Worker and connects the Cloudflare services declared by the project:

- D1 for messages and workspace data
- R2 for file attachments
- KV for short-lived connection tickets
- Durable Objects for live coordination
- RealtimeKit for optional voice media

The person or organization that deploys a workspace controls its infrastructure, configuration, and data.

## Cost and license

Discoflare is free software released under the MIT License. There is no Discoflare subscription. Cloudflare and optional RealtimeKit usage are billed separately by their providers.

## Availability

The current release is a web application. Desktop, iOS, and Android clients are planned but are not currently available.

## Deployment

The primary installer at [discoflare.com/deploy](https://discoflare.com/deploy) connects directly to Cloudflare and does not require GitHub. It can create a new workspace or update an existing Discoflare Worker while keeping its data resources. The Cloudflare Workers Paid plan is required because Discoflare agent sandboxes use Containers.

The repository-based Cloudflare Deploy Button remains available as an alternative for people who prefer to own a GitHub or GitLab clone.

## Links

- [Source repository](https://github.com/vnmtvlv/discoflare)
- [Architecture documentation](https://github.com/vnmtvlv/discoflare/blob/main/docs/architecture.md)
- [Deployment guide](https://github.com/vnmtvlv/discoflare/blob/main/docs/deployment.md)
- [Public sandbox](https://sandbox.discoflare.com)
- [Deploy with Discoflare](https://discoflare.com/deploy)
- [Deploy with GitHub](https://deploy.workers.cloudflare.com/?url=https://github.com/vnmtvlv/discoflare)
- [Privacy policy](https://discoflare.com/privacy)
- [Terms of use](https://discoflare.com/terms)
