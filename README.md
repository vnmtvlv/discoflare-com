# discoflare.com

Marketing site for [Discoflare](https://github.com/vnmtvlv/discoflare), built with Nuxt 4 and Nuxt UI 4.

## Development

```bash
pnpm install
pnpm dev
```

## Verify and build

```bash
pnpm typecheck
pnpm build
```

The marketing routes are prerendered. The Cloudflare OAuth installer under `/deploy` and `/api/cloudflare/**` runs in the Nuxt Worker.

## Deployment

Cloudflare Workers Builds deploys the site automatically when a commit is pushed to `main`:

```bash
pnpm deploy
```

The Worker and `discoflare.com` custom domain are configured in [`wrangler.jsonc`](wrangler.jsonc).

Production requires the secrets from `.env.example`. Register the OAuth callback as `https://discoflare.com/api/cloudflare/oauth/callback` and make the Cloudflare OAuth client public after verifying `discoflare.com`. Installed workspaces require the Cloudflare Workers Paid plan because they use Containers for agent sandboxes.

## Product demos

Demo sections use coded previews until real product recordings are ready. See [`public/demos/README.md`](public/demos/README.md) for the video convention.

Brand assets are copied from the Discoflare product repository so this site can deploy independently.

## Crawler and agent discovery

`public/robots.txt` keeps the public site crawlable and points to `public/sitemap.xml`. `public/llms.txt` is the concise agent entry point and links to Markdown versions of the product, privacy, and terms pages. Keep those files aligned whenever the corresponding site content changes.
