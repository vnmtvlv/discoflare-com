import type Cloudflare from 'cloudflare'
import type { DeployRequest, InstallerAssetsPayload, InstallerReleaseManifest } from '../../shared/installer'
import { cloudflareApi } from './cloudflare-client'
import { randomBase64Url } from './cloudflare-oauth'

type WorkerUploadResult = {
  deployment_id?: string
  id?: string
}

type WorkerVersion = {
  resources?: {
    bindings?: Array<{ type: string, class_name?: string, namespace_id?: string }>
  }
}

type ContainerApplication = {
  id: string
  name: string
  durable_objects?: { namespace_id?: string }
  configuration?: Record<string, unknown>
}

type ExistingWorkerBinding = {
  name: string
  type: string
  text?: string
  class_name?: string
}

type ExistingWorker = {
  exists: boolean
  migrationTag?: string
}

const installerMarker = 'discoflare.com/v1'

function isDiscoflareWorker(bindings: ExistingWorkerBinding[]) {
  const marker = bindings.find(binding => binding.name === 'DISCOFLARE_INSTALLATION')
  if (marker?.type === 'plain_text' && marker.text === installerMarker) return true

  const legacyBindings = [
    { name: 'DB', type: 'd1' },
    { name: 'FILES', type: 'r2_bucket' },
    { name: 'TICKETS', type: 'kv_namespace' },
    { name: 'CHANNEL_DO', type: 'durable_object_namespace', className: 'ChannelDurableObject' },
    { name: 'WORKSPACE_DO', type: 'durable_object_namespace', className: 'WorkspaceDurableObject' },
    { name: 'RATE_LIMIT_DO', type: 'durable_object_namespace', className: 'RateLimitDurableObject' },
    { name: 'AGENT_DO', type: 'durable_object_namespace', className: 'DiscoflareAgent' },
    { name: 'AGENT_SANDBOX', type: 'durable_object_namespace', className: 'Sandbox' },
    { name: 'AGENT_TASK_WORKFLOW', type: 'workflow', className: 'AgentTaskWorkflow' },
  ]

  return legacyBindings.every(expected => bindings.some(binding => (
    binding.name === expected.name
    && binding.type === expected.type
    && (!expected.className || binding.class_name === expected.className)
  )))
}

async function inspectWorker(client: Cloudflare, accountId: string, workerName: string): Promise<ExistingWorker> {
  for await (const worker of client.workers.scripts.list({ account_id: accountId })) {
    if (worker.id !== workerName) continue
    const settings = await client.workers.scripts.scriptAndVersionSettings.get(workerName, { account_id: accountId })
    if (!isDiscoflareWorker(settings.bindings as ExistingWorkerBinding[] || [])) {
      throw createError({ statusCode: 409, statusMessage: `A non-Discoflare Worker named ${workerName} already exists` })
    }
    return { exists: true, migrationTag: worker.migration_tag }
  }
  return { exists: false }
}

async function ensureD1(client: Cloudflare, accountId: string, name: string) {
  for await (const database of client.d1.database.list({ account_id: accountId, name })) {
    if (database.name === name && database.uuid) return database.uuid
  }
  const database = await client.d1.database.create({ account_id: accountId, name })
  if (!database.uuid) throw createError({ statusCode: 502, statusMessage: 'Cloudflare did not return the D1 database ID' })
  return database.uuid
}

async function ensureR2(client: Cloudflare, accountId: string, name: string) {
  let cursor: string | undefined
  do {
    const page = await client.r2.buckets.list({ account_id: accountId, name_contains: name, cursor })
    if (page.buckets?.some(bucket => bucket.name === name)) return name
    cursor = (page as { cursor?: string }).cursor
  } while (cursor)
  await client.r2.buckets.create({ account_id: accountId, name })
  return name
}

async function ensureKv(client: Cloudflare, accountId: string, title: string) {
  for await (const namespace of client.kv.namespaces.list({ account_id: accountId, per_page: 100 })) {
    if (namespace.title === title) return namespace.id
  }
  return (await client.kv.namespaces.create({ account_id: accountId, title })).id
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

async function applyD1Migrations(accessToken: string, accountId: string, databaseId: string, payload: InstallerAssetsPayload) {
  await cloudflareApi(accessToken, `/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql: 'CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);' }),
  })
  const rows = await cloudflareApi<Array<{ results?: Array<{ name?: string }> }>>(
    accessToken,
    `/accounts/${accountId}/d1/database/${databaseId}/query`,
    { method: 'POST', body: JSON.stringify({ sql: 'SELECT name FROM d1_migrations;' }) },
  )
  const applied = new Set(rows.flatMap(result => result.results || []).map(row => row.name).filter(Boolean))
  for (const migration of payload.migrations) {
    if (!/^[0-9A-Za-z_.-]+$/.test(migration.name) || applied.has(migration.name)) continue
    const sql = `${migration.sql.replaceAll('--> statement-breakpoint', '\n')}\nINSERT INTO d1_migrations (name) VALUES (${sqlString(migration.name)});`
    await cloudflareApi(accessToken, `/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({ sql }),
    })
  }
}

async function uploadAssets(accessToken: string, accountId: string, workerName: string, payload: InstallerAssetsPayload) {
  const manifest = Object.fromEntries(payload.assets.map(asset => [asset.path, { hash: asset.hash, size: asset.size }]))
  const session = await cloudflareApi<{ jwt: string, buckets?: string[][] }>(
    accessToken,
    `/accounts/${accountId}/workers/scripts/${workerName}/assets-upload-session`,
    { method: 'POST', body: JSON.stringify({ manifest }) },
  )
  let completionToken = session.buckets?.length ? undefined : session.jwt
  const byHash = new Map(payload.assets.map(asset => [asset.hash, asset]))
  for (const bucket of session.buckets || []) {
    const form = new FormData()
    for (const hash of bucket) {
      const asset = byHash.get(hash)
      if (!asset) throw createError({ statusCode: 502, statusMessage: 'Cloudflare requested an unknown release asset' })
      form.append(hash, new Blob([asset.contentBase64], { type: asset.contentType }), hash)
    }
    const response = await cloudflareApi<{ jwt?: string }>(
      session.jwt,
      `/accounts/${accountId}/workers/assets/upload?base64=true`,
      { method: 'POST', body: form },
    )
    if (response.jwt) completionToken = response.jwt
  }
  if (!completionToken) throw createError({ statusCode: 502, statusMessage: 'Cloudflare did not finish the static asset upload' })
  return completionToken
}

function durableObjectMigrations(manifest: InstallerReleaseManifest, worker: ExistingWorker) {
  const groups = new Map<string, string[]>()
  for (const item of manifest.durableObjects) {
    groups.set(item.migration, [...groups.get(item.migration) || [], item.className])
  }
  const steps = [...groups.entries()]
  const latestTag = steps.at(-1)?.[0]
  if (!latestTag) throw createError({ statusCode: 502, statusMessage: 'Discoflare release has no Durable Object migrations' })
  if (!worker.exists) {
    return { new_tag: latestTag, steps: steps.map(([, new_sqlite_classes]) => ({ new_sqlite_classes })) }
  }
  if (!worker.migrationTag) {
    throw createError({ statusCode: 409, statusMessage: 'Existing Discoflare Worker has no migration tag' })
  }
  const currentIndex = steps.findIndex(([tag]) => tag === worker.migrationTag)
  if (currentIndex === -1) {
    throw createError({ statusCode: 409, statusMessage: `Existing Discoflare migration ${worker.migrationTag} is not recognized` })
  }
  const pending = steps.slice(currentIndex + 1)
  if (!pending.length) return undefined
  return {
    old_tag: worker.migrationTag,
    new_tag: latestTag,
    steps: pending.map(([, new_sqlite_classes]) => ({ new_sqlite_classes })),
  }
}

async function uploadWorker(
  accessToken: string,
  accountId: string,
  request: DeployRequest,
  manifest: InstallerReleaseManifest,
  worker: ArrayBuffer,
  resources: { databaseId: string, bucketName: string, kvId: string, assetsJwt: string, origin: string },
  existing: ExistingWorker,
) {
  const bindings: Array<Record<string, unknown>> = [
    { type: 'd1', name: 'DB', database_id: resources.databaseId },
    { type: 'r2_bucket', name: 'FILES', bucket_name: resources.bucketName },
    { type: 'kv_namespace', name: 'TICKETS', namespace_id: resources.kvId },
    { type: 'ai', name: 'AI' },
    { type: 'assets', name: 'ASSETS' },
    { type: 'workflow', name: manifest.workflow.binding, workflow_name: `${request.workerName}-agent-tasks`, class_name: manifest.workflow.className },
    { type: 'plain_text', name: 'PUBLIC_ORIGIN', text: resources.origin },
    { type: 'plain_text', name: 'APP_NAME', text: request.appName },
    { type: 'plain_text', name: 'APP_TITLE', text: 'One workspace for humans, agents, and tasks.' },
    { type: 'plain_text', name: 'APP_SUBTITLE', text: 'Built on your Cloudflare stack.' },
    { type: 'plain_text', name: 'AUTH_REGISTRATION_MODE', text: request.registrationMode },
    { type: 'plain_text', name: 'AGENT_MODEL', text: '@cf/moonshotai/kimi-k2.7-code' },
    { type: 'plain_text', name: 'DISCOFLARE_INSTALLATION', text: installerMarker },
    { type: 'plain_text', name: 'DISCOFLARE_VERSION', text: manifest.version },
    ...manifest.durableObjects.map(item => ({ type: 'durable_object_namespace', name: item.binding, class_name: item.className })),
  ]
  if (!existing.exists) {
    bindings.push(
      { type: 'secret_text', name: 'AUTH_SECRET', text: randomBase64Url(48) },
      { type: 'secret_text', name: 'ADMIN_EMAIL', text: request.adminEmail },
      { type: 'secret_text', name: 'ADMIN_PASSWORD', text: request.adminPassword },
      { type: 'secret_text', name: 'ADMIN_NAME', text: request.adminName },
    )
  }

  const migrations = durableObjectMigrations(manifest, existing)
  const metadata: Record<string, unknown> = {
    main_module: 'discoflare-worker.mjs',
    compatibility_date: manifest.compatibilityDate,
    compatibility_flags: manifest.compatibilityFlags,
    bindings,
    containers: [{ name: `${request.workerName}-sandbox`, class_name: manifest.container.className }],
    assets: { jwt: resources.assetsJwt },
    observability: { enabled: true },
    annotations: {
      'workers/message': `Discoflare ${manifest.version} via discoflare.com`,
      'workers/tag': `discoflare-${manifest.version}`,
    },
  }
  if (migrations) metadata.migrations = migrations
  if (existing.exists) metadata.keep_bindings = ['secret_text']

  const form = new FormData()
  form.append('metadata', JSON.stringify(metadata))
  form.append('discoflare-worker.mjs', new Blob([worker], { type: 'application/javascript+module' }), 'discoflare-worker.mjs')
  return cloudflareApi<WorkerUploadResult>(
    accessToken,
    `/accounts/${accountId}/workers/scripts/${request.workerName}?excludeScript=true&bindings_inherit=strict`,
    { method: 'PUT', body: form },
  )
}

async function deployContainer(
  accessToken: string,
  accountId: string,
  workerName: string,
  versionId: string | undefined,
  manifest: InstallerReleaseManifest,
) {
  if (!versionId) throw createError({ statusCode: 502, statusMessage: 'Cloudflare did not return the Worker version ID' })
  const normalizedVersionId = versionId.includes('-')
    ? versionId
    : versionId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
  const version = await cloudflareApi<WorkerVersion>(accessToken, `/accounts/${accountId}/workers/scripts/${workerName}/versions/${normalizedVersionId}`)
  const namespaceId = version.resources?.bindings?.find(binding => binding.type === 'durable_object_namespace' && binding.class_name === manifest.container.className)?.namespace_id
  if (!namespaceId) throw createError({ statusCode: 502, statusMessage: 'Sandbox Durable Object was not provisioned' })

  const name = `${workerName}-sandbox`
  const applications = await cloudflareApi<ContainerApplication[]>(accessToken, `/accounts/${accountId}/containers/applications`)
  const existing = applications.find(application => application.name === name)
  if (existing?.durable_objects?.namespace_id && existing.durable_objects.namespace_id !== namespaceId) {
    throw createError({ statusCode: 409, statusMessage: `Container application ${name} belongs to another Worker` })
  }

  const configuration = {
    image: manifest.container.image,
    instance_type: manifest.container.instanceType,
    observability: { logs: { enabled: true } },
  }
  if (!existing) {
    await cloudflareApi(accessToken, `/accounts/${accountId}/containers/applications`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        scheduling_policy: 'default',
        configuration,
        instances: 0,
        max_instances: manifest.container.maxInstances,
        constraints: { tiers: [1, 2] },
        durable_objects: { namespace_id: namespaceId },
        rollout_active_grace_period: 0,
      }),
    })
    return
  }

  await cloudflareApi(accessToken, `/accounts/${accountId}/containers/applications/${existing.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ configuration, max_instances: manifest.container.maxInstances }),
  })
  await cloudflareApi(accessToken, `/accounts/${accountId}/containers/applications/${existing.id}/rollouts`, {
    method: 'POST',
    body: JSON.stringify({
      description: `Discoflare ${manifest.version}`,
      strategy: 'rolling',
      target_configuration: configuration,
      step_percentage: 100,
      kind: 'full_auto',
    }),
  })
}

async function ensureWorkersSubdomain(client: Cloudflare, accountId: string, workerName: string) {
  try {
    return (await client.workers.subdomains.get({ account_id: accountId })).subdomain
  }
  catch {
    const subdomain = `${workerName}-${accountId.slice(0, 8)}`
    return (await client.workers.subdomains.update({ account_id: accountId, subdomain })).subdomain
  }
}

export async function deployDiscoflare(
  client: Cloudflare,
  accessToken: string,
  request: DeployRequest,
  release: { manifest: InstallerReleaseManifest, worker: ArrayBuffer, assets: InstallerAssetsPayload },
) {
  const existing = await inspectWorker(client, request.accountId, request.workerName)
  if (!existing.exists) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(request.adminEmail)) {
      throw createError({ statusCode: 400, statusMessage: 'Enter a valid owner email' })
    }
    if (request.adminPassword.length < 12) {
      throw createError({ statusCode: 400, statusMessage: 'Owner password must be at least 12 characters' })
    }
    if (!request.adminName.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Enter the owner name' })
    }
  }
  const [databaseId, bucketName, kvId, subdomain] = await Promise.all([
    ensureD1(client, request.accountId, `${request.workerName}-db`),
    ensureR2(client, request.accountId, `${request.workerName}-files`),
    ensureKv(client, request.accountId, `${request.workerName}-tickets`),
    ensureWorkersSubdomain(client, request.accountId, request.workerName),
  ])
  await applyD1Migrations(accessToken, request.accountId, databaseId, release.assets)
  const assetsJwt = await uploadAssets(accessToken, request.accountId, request.workerName, release.assets)
  const origin = `https://${request.workerName}.${subdomain}.workers.dev`
  const uploaded = await uploadWorker(accessToken, request.accountId, request, release.manifest, release.worker, {
    databaseId,
    bucketName,
    kvId,
    assetsJwt,
    origin,
  }, existing)
  await client.workers.scripts.subdomain.create(request.workerName, {
    account_id: request.accountId,
    enabled: true,
    previews_enabled: true,
  })
  await deployContainer(accessToken, request.accountId, request.workerName, uploaded.deployment_id || uploaded.id, release.manifest)
  return { url: origin, version: release.manifest.version, updated: existing.exists }
}
