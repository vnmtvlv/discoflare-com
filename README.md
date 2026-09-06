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

Production requires the secrets from `.env.example`. Register the OAuth callback as `https://discoflare.com/api/cloudflare/oauth/callback`, allow the listed Worker, storage, Access, zone, DNS, and email scopes on that OAuth client, and make it public after verifying `discoflare.com`. Installed workspaces require the Cloudflare Workers Paid plan because they use Containers for agent sandboxes.

The public infrastructure counters use the `discoflare-com-telemetry` D1 database. Create it once with `pnpm db:create`, put the returned database ID into `wrangler.jsonc` if Wrangler does not resolve the name automatically, apply `migrations/` with `pnpm db:migrate`, and configure `NUXT_TELEMETRY_HASH_SECRET` as a Worker secret. Only a keyed hash of the Cloudflare account and Worker identity is retained; raw account IDs, Worker names, domains, owner details, and workspace content are not stored.

## Product demos

Demo sections use coded previews until real product recordings are ready. See [`public/demos/README.md`](public/demos/README.md) for the video convention.

Brand assets are copied from the Discoflare product repository so this site can deploy independently.

## Documentation

Public operator documentation lives in `content/docs` and is rendered at `/docs` with Nuxt Content. Documentation routes are prerendered explicitly because the same Worker also serves the dynamic Cloudflare installer.

The docs site can be published from a private website repository. The alternative Cloudflare Deploy Button builds from the separate public Discoflare application repository and requires manual Cloudflare account setup.

## Crawler and agent discovery

`public/robots.txt` keeps the public site crawlable and points to `public/sitemap.xml`. `public/llms.txt` is the concise agent entry point and links to Markdown versions of the product, privacy, and terms pages. Keep those files aligned whenever the corresponding site content changes.

## License

The source code is available under the [MIT License](LICENSE). The Discoflare name, logos, artwork, screenshots, and marketing copy are not licensed for reuse by the MIT License.
