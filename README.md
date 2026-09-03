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
pnpm generate
```

The site is fully prerendered and the deployable output is written to `.output/public`.

## Deployment

Cloudflare Workers Builds deploys the site automatically when a commit is pushed to `main`:

```bash
pnpm generate
pnpm deploy
```

The Worker and `discoflare.com` custom domain are configured in [`wrangler.jsonc`](wrangler.jsonc).

## Product demos

Demo sections use coded previews until real product recordings are ready. See [`public/demos/README.md`](public/demos/README.md) for the video convention.

Brand assets are copied from the Discoflare product repository so this site can deploy independently.

## Crawler and agent discovery

`public/robots.txt` keeps the public site crawlable and points to `public/sitemap.xml`. `public/llms.txt` is the concise agent entry point and links to Markdown versions of the product, privacy, and terms pages. Keep those files aligned whenever the corresponding site content changes.
