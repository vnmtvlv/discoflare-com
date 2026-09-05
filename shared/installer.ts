export type CloudflareAccount = {
  id: string
  name: string
  type: 'standard' | 'enterprise'
}

export type CloudflareZone = {
  id: string
  accountId: string
  name: string
  status: string
}

export type InstallerSessionResponse = {
  connected: boolean
  accounts: CloudflareAccount[]
  zones: CloudflareZone[]
}

export type DeployRequest = {
  accountId: string
  workerName: string
  adminEmail: string
  appName: string
  registrationMode: 'invite_only' | 'open'
  zoneId: string
  zoneName: string
  appSubdomain: string
  mailEnabled: boolean
  mailSubdomain: string
  mailLocalPart: string
  targetVersion?: string
}

export type DeployResponse = {
  url: string
  setupUrl?: string
  version: string
  updated: boolean
  appliedMigrations: string[]
  verified: boolean
}

export type CloudflareInstallation = {
  accountId: string
  workerName: string
  origin: string
  version: string | null
  configuration: DeployRequest
  resources: {
    databaseId: string | null
    bucketName: string | null
    kvId: string | null
    workflowName: string
    containerName: string
    mailZoneId: string | null
    mailDomain: string | null
    telemetryId: string | null
  }
}

export type UninstallRequest = {
  accountId: string
  workerName: string
  origin: string
  confirmation: string
  claim: string
}

export type UninstallResponse = {
  origin: string
  deletedResources: string[]
  deletedObjects: number
  remainingResources: string[]
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
