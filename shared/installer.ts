export type CloudflareAccount = {
  id: string
  name: string
  type: 'standard' | 'enterprise'
}

export type InstallerSessionResponse = {
  connected: boolean
  accounts: CloudflareAccount[]
}

export type DeployRequest = {
  accountId: string
  workerName: string
  adminEmail: string
  adminPassword: string
  adminName: string
  appName: string
  registrationMode: 'invite_only' | 'open'
}

export type DeployResponse = {
  url: string
  version: string
  updated: boolean
}

export type ReleaseAsset = {
  url: string
  sha256: string
  size: number
}

export type InstallerReleaseManifest = {
  schemaVersion: 1
  version: string
  releasedAt: string
  compatibilityDate: string
  compatibilityFlags: string[]
  worker: ReleaseAsset
  assets: ReleaseAsset
  container: {
    image: string
    className: string
    instanceType: string
    maxInstances: number
  }
  durableObjects: Array<{
    binding: string
    className: string
    migration: string
  }>
  workflow: {
    binding: string
    className: string
  }
}

export type InstallerAssetsPayload = {
  assets: Array<{
    path: string
    hash: string
    size: number
    contentType: string
    contentBase64: string
  }>
  migrations: Array<{
    name: string
    sql: string
  }>
}
