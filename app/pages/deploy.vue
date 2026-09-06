<script setup lang="ts">
import type {
  CloudflareInstallation,
  DeployProgressEvent,
  DeployProgressStep,
  DeployRequest,
  DeployResponse,
  InstallerSessionResponse,
} from '../../shared/installer'

type ProgressState = { state: 'waiting' | 'active' | 'complete', detail?: string }

const githubDeployUrl = 'https://deploy.workers.cloudflare.com/?url=https://github.com/vnmtvlv/discoflare'
const route = useRoute()
const upgradeOrigin = (() => {
  if (typeof route.query.upgrade !== 'string') return ''
  try {
    const url = new URL(route.query.upgrade)
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
      ? url.origin
      : ''
  }
  catch {
    return ''
  }
})()
const upgradeTarget = typeof route.query.target === 'string' && /^v?\d+\.\d+\.\d+$/.test(route.query.target)
  ? route.query.target
  : ''
const isUpgrade = Boolean(upgradeOrigin)
const oauthStartUrl = `/api/cloudflare/oauth/start?returnTo=${encodeURIComponent(route.fullPath)}`
const { data: session, status, refresh } = await useFetch<InstallerSessionResponse>('/api/cloudflare/session', {
  server: false,
  default: () => ({ connected: false, accounts: [], zones: [] }),
})

const form = reactive<DeployRequest>({
  accountId: '',
  workerName: 'discoflare',
  adminEmail: '',
  allowedEmails: [],
  appName: 'Discoflare',
  authMode: 'builtin',
  registrationMode: 'invite_only',
  customDomainEnabled: false,
  zoneId: '',
  zoneName: '',
  appSubdomain: 'discoflare',
  mailEnabled: false,
  mailSubdomain: 'discoflare',
  mailLocalPart: 'inbox',
  targetVersion: upgradeTarget || undefined,
})
const wizardStep = ref<0 | 1 | 2 | 3 | 4>(0)
const deploying = ref(false)
const allowedEmailsText = ref('')
const result = shallowRef<DeployResponse | null>(null)
const error = ref(typeof route.query.error === 'string' ? 'Cloudflare connection was not completed.' : '')
const installation = shallowRef<CloudflareInstallation | null>(null)
const installationLoading = ref(false)
const installationError = ref('')
const progressState = reactive<Partial<Record<DeployProgressStep, ProgressState>>>({})

watch(() => session.value.accounts, (accounts) => {
  if (!form.accountId && accounts[0]) form.accountId = accounts[0].id
}, { immediate: true })

watch(() => session.value.connected, (connected) => {
  if (connected && wizardStep.value === 0) wizardStep.value = 1
}, { immediate: true })

const accountZones = computed(() => session.value.zones.filter(zone => zone.accountId === form.accountId && zone.status === 'active'))
const appHostname = computed(() => form.customDomainEnabled && form.zoneName ? `${form.appSubdomain}.${form.zoneName}` : '')
const mailDomain = computed(() => form.zoneName ? `${form.mailSubdomain}.${form.zoneName}` : '')
const mailboxAddress = computed(() => mailDomain.value ? `${form.mailLocalPart}@${mailDomain.value}` : '')

watch(() => form.appSubdomain, (subdomain, previous) => {
  if (!form.mailSubdomain || form.mailSubdomain === previous) form.mailSubdomain = subdomain
})

watch([() => form.accountId, accountZones], ([, zones]) => {
  if (!zones.some(zone => zone.id === form.zoneId)) form.zoneId = zones[0]?.id || ''
}, { immediate: true })

watch(() => form.zoneId, (zoneId) => {
  form.zoneName = session.value.zones.find(zone => zone.id === zoneId)?.name || ''
}, { immediate: true })

const instanceReady = computed(() => {
  if (isUpgrade) return Boolean(installation.value)
  return Boolean(
    form.accountId
    && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(form.workerName)
    && form.appName.trim()
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.adminEmail),
  )
})

const optionsReady = computed(() => Boolean(
  (!form.customDomainEnabled && !form.mailEnabled)
  || (form.zoneId
    && (!form.customDomainEnabled || form.appSubdomain)
    && (!form.mailEnabled || (form.mailSubdomain && form.mailLocalPart))),
))

const pageTitle = computed(() => {
  if (wizardStep.value === 0) return isUpgrade ? 'Upgrade Discoflare' : 'Deploy Discoflare'
  if (wizardStep.value === 1) return isUpgrade ? 'Choose the installation' : 'Name your workspace'
  if (wizardStep.value === 2) return isUpgrade ? 'Review your upgrade' : 'Optional features'
  if (wizardStep.value === 3) return isUpgrade ? 'Upgrading Discoflare' : 'Deploying Discoflare'
  return result.value?.updated ? 'Discoflare is updated' : 'Your Discoflare is live'
})

const pageDescription = computed(() => {
  if (wizardStep.value === 0) return 'Your own team workspace, in your Cloudflare account'
  if (wizardStep.value === 1) return isUpgrade ? `Find the installation at ${upgradeOrigin}` : 'Choose its address and who signs in first'
  if (wizardStep.value === 2) return isUpgrade ? 'Existing storage and configuration stay in place' : 'Choose a custom workspace address, workspace email, or both'
  if (wizardStep.value === 3) return 'Setting everything up in your Cloudflare account'
  return 'Everything was deployed and verified in your account'
})

const deploymentItems = computed<Array<{ step: DeployProgressStep, label: string }>>(() => [
  { step: 'account', label: 'Checking your Cloudflare account' },
  { step: 'release', label: 'Loading the published Discoflare release' },
  { step: 'installation', label: isUpgrade ? 'Inspecting the existing installation' : 'Setting up your public URL' },
  { step: 'storage', label: isUpgrade ? 'Checking D1, R2, and KV storage' : 'Creating D1, R2, and KV storage' },
  { step: 'database', label: 'Applying database migrations' },
  { step: 'assets', label: 'Uploading the web application' },
  { step: 'access', label: form.authMode === 'access' ? 'Setting up Cloudflare Access' : 'Configuring Discoflare accounts' },
  { step: 'worker', label: 'Deploying the Discoflare Worker' },
  { step: 'domain', label: form.customDomainEnabled ? `Publishing ${appHostname.value}` : 'Publishing your workers.dev address' },
  ...(form.mailEnabled ? [{ step: 'mail' as const, label: `Setting up workspace email for ${mailDomain.value}` }] : []),
  { step: 'sandbox', label: 'Deploying the agent sandbox' },
  { step: 'schedule', label: 'Scheduling workspace maintenance' },
  { step: 'verify', label: 'Verifying your deployment' },
])

const completedProgress = computed(() => deploymentItems.value.filter(item => progressState[item.step]?.state === 'complete').length)
const progressValue = computed(() => Math.round((completedProgress.value / deploymentItems.value.length) * 100))

async function disconnect() {
  await $fetch('/api/cloudflare/logout', { method: 'POST' })
  result.value = null
  installation.value = null
  wizardStep.value = 0
  await refresh()
}

async function loadInstallation() {
  if (!isUpgrade || !session.value.connected) return
  installationLoading.value = true
  installationError.value = ''
  try {
    const response = await $fetch<{ installations: CloudflareInstallation[] }>('/api/cloudflare/installations', {
      query: { origin: upgradeOrigin },
    })
    if (response.installations.length !== 1) {
      installation.value = null
      installationError.value = response.installations.length
        ? 'More than one matching Discoflare installation was found.'
        : 'No matching Discoflare installation is available to this Cloudflare account.'
      return
    }
    installation.value = response.installations[0]!
    Object.assign(form, installation.value.configuration)
    allowedEmailsText.value = installation.value.configuration.allowedEmails.join(', ')
  }
  catch (cause) {
    const value = cause as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    installationError.value = value.data?.statusMessage || value.statusMessage || value.message || 'Could not inspect this Discoflare installation.'
  }
  finally {
    installationLoading.value = false
  }
}

watch(() => session.value.connected, (connected) => {
  if (connected) void loadInstallation()
}, { immediate: true })

function handleDeployEvent(message: DeployProgressEvent) {
  if (message.type === 'progress') {
    progressState[message.step] = { state: message.state, detail: message.detail }
    return
  }
  if (message.type === 'error') throw new Error(message.message)
  result.value = message.result
  wizardStep.value = 4
}

async function deploy() {
  if ((isUpgrade && !installation.value) || !optionsReady.value) return
  deploying.value = true
  error.value = ''
  result.value = null
  wizardStep.value = 3
  for (const step of deploymentItems.value) progressState[step.step] = { state: 'waiting' }

  try {
    const allowedEmails = form.authMode === 'access'
      ? allowedEmailsText.value.split(',').map(email => email.trim()).filter(Boolean)
      : []
    const response = await fetch('/api/cloudflare/deploy-stream', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...form, allowedEmails }),
    })
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { statusMessage?: string, message?: string }
      throw new Error(failure.statusMessage || failure.message || `Deployment failed (${response.status})`)
    }
    if (!response.body) throw new Error('Deployment progress stream was unavailable.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) handleDeployEvent(JSON.parse(line) as DeployProgressEvent)
      }
      if (done) break
    }
    if (buffer.trim()) handleDeployEvent(JSON.parse(buffer) as DeployProgressEvent)
    if (!result.value) throw new Error('Deployment ended before the workspace was verified.')
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Deployment failed.'
  }
  finally {
    deploying.value = false
  }
}

useSeoMeta({
  title: isUpgrade ? 'Upgrade Discoflare' : 'Deploy Discoflare',
  description: isUpgrade ? 'Upgrade an existing Discoflare installation.' : 'Install Discoflare in your Cloudflare account.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <UHeader to="/" title="Discoflare" class="border-b border-muted/70 bg-default/80 backdrop-blur-xl">
      <template #title><BrandLogo :linked="false" /></template>
      <template #right>
        <UColorModeButton color="neutral" variant="ghost" />
        <UButton to="/" label="Back home" trailing-icon="i-ph-arrow-left" color="neutral" variant="ghost" />
      </template>
    </UHeader>

    <main>
      <UContainer class="py-12 sm:py-16">
        <div class="mx-auto max-w-2xl">
          <div class="text-center">
            <p class="text-sm font-medium text-primary">Cloudflare installer</p>
            <h1 class="display-title mt-3 text-4xl font-semibold text-highlighted sm:text-5xl">{{ pageTitle }}</h1>
            <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">{{ pageDescription }}</p>

            <div class="mx-auto mt-7 grid max-w-56 grid-cols-5 gap-2" aria-label="Deployment progress">
              <span
                v-for="step in 5"
                :key="step"
                class="h-1 rounded-full transition-colors"
                :class="step - 1 <= wizardStep ? 'bg-primary' : 'bg-accented'"
              />
            </div>
          </div>

          <ClientOnly>
            <UCard class="mt-8" :ui="{ body: 'p-6 sm:p-8' }">
              <template v-if="wizardStep === 0">
                <div v-if="status === 'pending'" class="flex min-h-56 items-center justify-center gap-3 text-muted">
                  <UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />
                  Checking Cloudflare connection
                </div>

                <div v-else class="space-y-6">
                  <div>
                    <h2 class="text-lg font-semibold text-highlighted">Deploy Discoflare to your Cloudflare account</h2>
                    <p class="mt-1 text-sm text-muted">Here’s what will happen</p>
                  </div>

                  <div class="space-y-3">
                    <div class="flex gap-4 rounded-xl border border-default p-4">
                      <UIcon name="i-ph-lock-key" class="mt-0.5 size-5 shrink-0 text-primary" />
                      <div><p class="text-sm font-medium text-highlighted">Sign in with Cloudflare</p><p class="mt-1 text-sm text-muted">Approve a temporary grant in the Cloudflare dashboard.</p></div>
                    </div>
                    <div class="flex gap-4 rounded-xl border border-default p-4">
                      <UIcon name="i-ph-cloud-arrow-up" class="mt-0.5 size-5 shrink-0 text-primary" />
                      <div><p class="text-sm font-medium text-highlighted">We set up Discoflare for you</p><p class="mt-1 text-sm text-muted">The installer creates the Worker, storage, Access, and public URL in your account.</p></div>
                    </div>
                    <div class="flex gap-4 rounded-xl border border-default p-4">
                      <UIcon name="i-ph-github-logo" class="mt-0.5 size-5 shrink-0 text-primary" />
                      <div><p class="text-sm font-medium text-highlighted">Open-source code</p><p class="mt-1 text-sm text-muted">Every guided installation uses the same published Discoflare release.</p></div>
                    </div>
                  </div>

                  <UAlert v-if="error" color="error" variant="subtle" :title="error" />
                  <div class="grid gap-3 sm:grid-cols-2">
                    <UButton :to="oauthStartUrl" external label="Sign in with Cloudflare" trailing-icon="i-ph-arrow-right" size="xl" block />
                    <UButton v-if="!isUpgrade" :to="githubDeployUrl" target="_blank" label="Deploy with GitHub" trailing-icon="i-ph-arrow-up-right" color="neutral" variant="outline" size="xl" block />
                  </div>
                  <p class="text-xs leading-5 text-muted">The token stays only in this one-hour installer session and is never added to your Discoflare Worker.</p>
                </div>
              </template>

              <template v-else-if="wizardStep === 1">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <h2 class="text-lg font-semibold text-highlighted">{{ isUpgrade ? 'Cloudflare installation' : 'Workspace details' }}</h2>
                    <p class="mt-1 text-sm text-muted">{{ isUpgrade ? 'We will update this Worker in place.' : 'The Worker name becomes part of the default public URL.' }}</p>
                  </div>
                  <UButton type="button" label="Sign out" color="neutral" variant="ghost" size="sm" @click="disconnect" />
                </div>

                <div v-if="isUpgrade" class="mt-6">
                  <div v-if="installationLoading" class="flex items-center gap-3 py-8 text-sm text-muted"><UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />Finding this installation</div>
                  <UAlert v-else-if="installationError" color="error" :title="installationError" />
                  <div v-else-if="installation" class="rounded-xl border border-default bg-elevated p-5">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div><p class="font-medium text-highlighted">{{ installation.configuration.appName }}</p><p class="mt-1 text-sm text-muted">{{ installation.origin }}</p></div>
                      <UBadge :label="installation.version ? `Discoflare ${installation.version}` : 'Legacy installation'" color="neutral" variant="subtle" />
                    </div>
                    <p class="mt-4 text-sm text-toned">Worker: {{ installation.workerName }}</p>
                  </div>
                </div>

                <form v-else class="mt-6 space-y-5" @submit.prevent="wizardStep = 2">
                  <UFormField label="Cloudflare account" required><USelect v-model="form.accountId" :items="session.accounts.map(account => ({ label: account.name, value: account.id }))" value-key="value" class="w-full" /></UFormField>
                  <UFormField label="Worker name" required hint="Lowercase letters, numbers, and hyphens."><UInput v-model="form.workerName" autocomplete="off" class="w-full" /></UFormField>
                  <UFormField label="Workspace name" required><UInput v-model="form.appName" autocomplete="organization" class="w-full" /></UFormField>
                  <UFormField label="Owner email" required hint="This address becomes the first workspace owner."><UInput v-model="form.adminEmail" type="email" autocomplete="email" class="w-full" /></UFormField>
                  <UFormField label="Sign-in" required>
                    <URadioGroup
                      v-model="form.authMode"
                      :items="[
                        { label: 'Discoflare accounts', value: 'builtin', description: 'Create the Owner password after deployment and invite members from the workspace.' },
                        { label: 'Cloudflare Access', value: 'access', description: 'Put Cloudflare Zero Trust in front of the workspace.' },
                      ]"
                    />
                  </UFormField>
                  <UAlert
                    v-if="form.authMode === 'builtin'"
                    color="neutral"
                    variant="subtle"
                    icon="i-ph-user-circle"
                    title="Discoflare handles sign-in"
                    description="After deployment, a private one-time link creates the Owner password. Private invite links work without workspace email; verification and password reset can be connected later."
                  />
                  <UAlert
                    v-else
                    color="warning"
                    variant="subtle"
                    icon="i-ph-warning"
                    title="Cloudflare Access is an advanced option"
                    description="Cloudflare sends email codes, but member access is managed in Zero Trust instead of Discoflare. Adding or removing people requires editing the Access policy, and changing sign-in mode later requires a manual migration."
                  />
                  <UFormField v-if="form.authMode === 'access'" label="Also allow these emails" hint="Optional, comma-separated."><UInput v-model="allowedEmailsText" autocomplete="off" class="w-full" placeholder="friend@example.com, teammate@example.com" /></UFormField>
                </form>

                <div class="-mx-6 -mb-6 mt-8 flex justify-end border-t border-muted px-6 py-5 sm:-mx-8 sm:-mb-8 sm:px-8">
                  <UButton type="button" label="Continue" trailing-icon="i-ph-arrow-right" size="lg" :disabled="!instanceReady" @click="wizardStep = 2" />
                </div>
              </template>

              <template v-else-if="wizardStep === 2">
                <div class="flex items-center justify-between gap-4">
                  <div><h2 class="text-lg font-semibold text-highlighted">{{ isUpgrade ? 'Ready to upgrade' : 'Choose optional features' }}</h2><p class="mt-1 text-sm text-muted">{{ isUpgrade ? 'The installer keeps the current hostname, storage, and sign-in mode.' : 'Choose only what this first installation needs.' }}</p></div>
                  <UButton type="button" label="Sign out" color="neutral" variant="ghost" size="sm" @click="disconnect" />
                </div>

                <UAlert
                  v-if="!isUpgrade && form.authMode === 'builtin'"
                  class="mt-6"
                  color="neutral"
                  variant="subtle"
                  title="Workspace email is separate from sign-in"
                  description="Discoflare accounts and private invite links do not need a mail domain. Enable workspace email only for shared mailboxes and replies; auth verification and password reset can be connected later."
                />

                <div v-if="isUpgrade && installation" class="mt-6 space-y-3 rounded-xl border border-default bg-elevated p-5 text-sm">
                  <div class="flex justify-between gap-4"><span class="text-muted">Installation</span><span class="text-right text-default">{{ installation.origin }}</span></div>
                  <div class="flex justify-between gap-4"><span class="text-muted">Target</span><span class="text-default">{{ upgradeTarget ? upgradeTarget.replace(/^v/, '') : 'Latest release' }}</span></div>
                  <div class="flex justify-between gap-4"><span class="text-muted">Data</span><span class="text-default">Existing D1, R2, and KV</span></div>
                </div>

                <form v-else class="mt-6 space-y-6" @submit.prevent="deploy">
                  <div class="space-y-5">
                    <USwitch v-model="form.customDomainEnabled" label="Custom domain" description="Otherwise the workspace uses your account’s workers.dev address." />
                    <div class="border-t border-muted pt-5"><USwitch v-model="form.mailEnabled" label="Workspace email" description="Create a mailbox and route this domain’s catch-all email to Discoflare." /></div>
                  </div>

                  <div v-if="form.customDomainEnabled || form.mailEnabled" class="space-y-5 rounded-xl border border-default bg-elevated p-5">
                    <div>
                      <p class="text-sm font-medium text-highlighted">Domain settings</p>
                      <p v-if="form.customDomainEnabled && form.mailEnabled" class="mt-1 text-sm text-muted">The same Cloudflare domain is used for the workspace address and workspace email.</p>
                      <p v-else-if="form.customDomainEnabled" class="mt-1 text-sm text-muted">Email routing stays unchanged.</p>
                      <p v-else class="mt-1 text-sm text-muted">This domain is used only for workspace email. The workspace keeps its workers.dev address.</p>
                    </div>
                    <UFormField label="Cloudflare domain" required hint="Must be active in the selected account."><USelect v-model="form.zoneId" :items="accountZones.map(zone => ({ label: zone.name, value: zone.id }))" value-key="value" class="w-full" placeholder="Select a domain" /></UFormField>
                    <UFormField v-if="form.customDomainEnabled" label="Discoflare subdomain" required><UInput v-model="form.appSubdomain" autocomplete="off" class="w-full"><template #trailing><span v-if="form.zoneName" class="text-xs text-muted">.{{ form.zoneName }}</span></template></UInput></UFormField>
                    <div v-if="form.mailEnabled" class="grid gap-5 sm:grid-cols-2">
                      <UFormField label="Email subdomain" required><UInput v-model="form.mailSubdomain" autocomplete="off" class="w-full"><template #trailing><span v-if="form.zoneName" class="text-xs text-muted">.{{ form.zoneName }}</span></template></UInput></UFormField>
                      <UFormField label="First mailbox" required><UInput v-model="form.mailLocalPart" autocomplete="off" class="w-full"><template #trailing><span v-if="mailDomain" class="text-xs text-muted">@{{ mailDomain }}</span></template></UInput></UFormField>
                    </div>
                    <UAlert v-if="form.zoneName && form.mailEnabled" color="warning" variant="subtle" :title="`Email for ${mailDomain} will be handled by Discoflare`" :description="`The installer creates ${mailboxAddress}. Existing non-Cloudflare MX or catch-all routes stop installation instead of being replaced.`" />
                  </div>

                  <UFormField v-if="form.authMode === 'builtin'" label="Registration" required>
                    <URadioGroup
                      v-model="form.registrationMode"
                      :items="[
                        { label: 'Invite only', value: 'invite_only', description: 'Members create accounts from private invite links.' },
                        { label: 'Open signup', value: 'open', description: 'Anyone who can reach the workspace can create an account.' },
                      ]"
                    />
                  </UFormField>
                </form>

                <div class="-mx-6 -mb-6 mt-8 flex items-center justify-between gap-3 border-t border-muted px-6 py-5 sm:-mx-8 sm:-mb-8 sm:px-8">
                  <UButton type="button" label="Back" leading-icon="i-ph-arrow-left" color="neutral" variant="ghost" @click="wizardStep = 1" />
                  <UButton type="button" :label="isUpgrade ? `Upgrade${upgradeTarget ? ` to ${upgradeTarget.replace(/^v/, '')}` : ''}` : 'Deploy Discoflare'" trailing-icon="i-ph-arrow-right" size="lg" :disabled="!optionsReady" @click="deploy" />
                </div>
              </template>

              <template v-else-if="wizardStep === 3">
                <div class="flex items-start justify-between gap-4">
                  <div><h2 class="text-lg font-semibold text-highlighted">{{ isUpgrade ? 'Upgrading your workspace' : 'Setting up your workspace' }}</h2><p class="mt-1 text-sm text-muted">Keep this tab open until verification finishes.</p></div>
                  <UButton v-if="!deploying" type="button" label="Sign out" color="neutral" variant="ghost" size="sm" @click="disconnect" />
                </div>
                <UProgress class="mt-6" :model-value="progressValue" />

                <ul class="mt-7 space-y-4">
                  <li v-for="item in deploymentItems" :key="item.step" class="flex items-start gap-3 text-sm">
                    <UIcon v-if="progressState[item.step]?.state === 'complete'" name="i-ph-check" class="mt-0.5 size-4 shrink-0 text-success" />
                    <UIcon v-else-if="progressState[item.step]?.state === 'active'" name="i-ph-spinner-gap" class="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                    <span v-else class="mt-1.5 size-2 shrink-0 rounded-full bg-accented" />
                    <div class="min-w-0">
                      <p :class="progressState[item.step]?.state === 'waiting' ? 'text-muted' : 'text-default'">{{ item.label }}</p>
                      <p v-if="progressState[item.step]?.detail" class="mt-0.5 text-xs text-muted">{{ progressState[item.step]?.detail }}</p>
                    </div>
                  </li>
                </ul>

                <UAlert v-if="error" class="mt-7" color="error" variant="subtle" title="Deployment stopped" :description="error" />
                <div v-if="error" class="mt-5 flex gap-3"><UButton label="Try again" icon="i-ph-arrow-clockwise" @click="deploy" /><UButton label="Back" color="neutral" variant="outline" @click="wizardStep = 2" /></div>
              </template>

              <template v-else-if="result">
                <div class="py-3 text-center">
                  <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15"><UIcon name="i-ph-check" class="size-7 text-success" /></div>
                  <h2 class="mt-5 text-xl font-semibold text-highlighted">{{ result.updated ? `Updated to Discoflare ${result.version}` : `Discoflare ${result.version} is ready` }}</h2>
                  <p class="mt-2 text-sm text-muted">Workspace health and deployed version were verified.</p>
                  <UButton class="mt-6" :to="result.setupUrl || result.url" target="_blank" :label="result.url.replace(/^https:\/\//, '')" trailing-icon="i-ph-arrow-up-right" color="neutral" variant="outline" size="lg" />
                </div>

                <div v-if="form.authMode === 'access'" class="mt-5 flex gap-3 rounded-xl border border-default bg-elevated p-4">
                  <UIcon name="i-ph-shield-check" class="mt-0.5 size-5 shrink-0 text-success" />
                  <div>
                    <p class="text-sm font-medium text-highlighted">Protected by Cloudflare Access</p>
                    <p class="mt-1 text-sm leading-6 text-muted">
                      {{ result.updated ? 'Open the workspace and sign in through its existing Access policy.' : `Open the workspace and sign in as ${form.adminEmail}. Cloudflare sends a one-time code, and the owner account is created on first sign-in.` }}
                    </p>
                  </div>
                </div>
                <div v-else-if="result.setupUrl" class="mt-5 flex gap-3 rounded-xl border border-default bg-elevated p-4">
                  <UIcon name="i-ph-key" class="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p class="text-sm font-medium text-highlighted">Create the workspace Owner</p>
                    <p class="mt-1 text-sm leading-6 text-muted">Use the private setup link above to choose the first password. The link becomes unusable after the Owner is created.</p>
                  </div>
                </div>

                <div class="mt-5 rounded-xl border border-default p-4 text-sm text-muted">
                  <p v-if="result.appliedMigrations.length">Applied {{ result.appliedMigrations.length }} D1 {{ result.appliedMigrations.length === 1 ? 'migration' : 'migrations' }}: {{ result.appliedMigrations.join(', ') }}.</p>
                  <p v-else>No D1 migrations were pending.</p>
                </div>

                <p class="mt-6 text-center text-xs text-muted">Want to customize your deployment? <NuxtLink to="https://github.com/vnmtvlv/discoflare" external target="_blank" class="text-primary hover:underline">Get the source on GitHub</NuxtLink>.</p>

                <div class="-mx-6 -mb-6 mt-8 flex flex-col-reverse gap-3 border-t border-muted px-6 py-5 sm:-mx-8 sm:-mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <p class="text-xs text-muted">Optional integrations can be configured later in the workspace.</p>
                  <UButton :to="result.setupUrl || result.url" target="_blank" :label="result.updated || !result.setupUrl ? 'Open your Discoflare' : 'Create workspace owner'" trailing-icon="i-ph-arrow-up-right" size="lg" />
                </div>
              </template>
            </UCard>

            <template #fallback>
              <UCard class="mt-8"><div class="flex min-h-56 items-center justify-center gap-3 text-muted"><UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />Checking Cloudflare connection</div></UCard>
            </template>
          </ClientOnly>
        </div>
      </UContainer>
    </main>
  </div>
</template>
