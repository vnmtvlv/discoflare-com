import type { InstallerAssetsPayload, InstallerReleaseManifest, ReleaseAsset } from '../../shared/installer'

async function sha256(value: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', value)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function fetchVerifiedAsset(asset: ReleaseAsset, manifestUrl: string) {
  const url = new URL(asset.url, manifestUrl)
  if (url.protocol !== 'https:') throw createError({ statusCode: 502, statusMessage: 'Release asset URL must use HTTPS' })
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw createError({ statusCode: 502, statusMessage: `Release asset is unavailable (${response.status})` })
  const body = await response.arrayBuffer()
  if (body.byteLength !== asset.size || await sha256(body) !== asset.sha256) {
    throw createError({ statusCode: 502, statusMessage: 'Release asset integrity check failed' })
  }
  return body
}

function assertManifest(value: unknown): asserts value is InstallerReleaseManifest {
  const manifest = value as Partial<InstallerReleaseManifest> | null
  if (!manifest || manifest.schemaVersion !== 1 || !manifest.version || !manifest.worker || !manifest.assets) {
    throw createError({ statusCode: 502, statusMessage: 'Discoflare release manifest is invalid' })
  }
}

export async function loadDiscoflareRelease(manifestUrl: string) {
  const response = await fetch(manifestUrl, { redirect: 'follow' })
  if (!response.ok) throw createError({ statusCode: 502, statusMessage: `Discoflare release is unavailable (${response.status})` })
  const manifest = await response.json()
  assertManifest(manifest)

  const [worker, assetsBuffer] = await Promise.all([
    fetchVerifiedAsset(manifest.worker, manifestUrl),
    fetchVerifiedAsset(manifest.assets, manifestUrl),
  ])
  const assets = JSON.parse(new TextDecoder().decode(assetsBuffer)) as InstallerAssetsPayload
  if (!Array.isArray(assets.assets) || !Array.isArray(assets.migrations)) {
    throw createError({ statusCode: 502, statusMessage: 'Discoflare asset bundle is invalid' })
  }
  return { manifest, worker, assets }
}
