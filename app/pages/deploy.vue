<script setup lang="ts">
import type { CloudflareInstallation, DeployRequest, DeployResponse, InstallerSessionResponse } from '../../shared/installer'

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
  authMode: 'access',
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
const deploying = ref(false)
const allowedEmailsText = ref('')
const result = ref<DeployResponse | null>(null)
const error = ref(typeof route.query.error === 'string' ? 'Cloudflare connection was not completed.' : '')
const installation = shallowRef<CloudflareInstallation | null>(null)
const installationLoading = ref(false)
const installationError = ref('')

watch(() => session.value.accounts, (accounts) => {
  if (!form.accountId && accounts[0]) form.accountId = accounts[0].id
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

async function disconnect() {
  await $fetch('/api/cloudflare/logout', { method: 'POST' })
  result.value = null
  installation.value = null
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

async function deploy() {
  if (isUpgrade && !installation.value) return
  deploying.value = true
  error.value = ''
  result.value = null
  try {
    const allowedEmails = form.authMode === 'access'
      ? allowedEmailsText.value.split(',').map(email => email.trim()).filter(Boolean)
      : []
    result.value = await $fetch<DeployResponse>('/api/cloudflare/deploy', { method: 'POST', body: { ...form, allowedEmails } })
  }
  catch (cause) {
    const value = cause as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    error.value = value.data?.statusMessage || value.statusMessage || value.message || 'Deployment failed.'
  }
  finally {
    deploying.value = false
  }
}

const requirements = [
  { icon: 'i-ph-cloud', label: 'A Cloudflare account on the Workers Paid plan', note: 'Agent sandboxes run on Containers, which the free plan does not include.' },
  { icon: 'i-ph-globe-hemisphere-west', label: 'A workers.dev address is enough', note: 'A custom domain is optional and can be added during installation.' },
  { icon: 'i-ph-envelope-simple', label: 'An email address for the first owner', note: 'By default Cloudflare Access sends a one-time sign-in code to it.' },
]

const installerSteps = [
  { number: '01', title: 'Connect Cloudflare', description: 'Approve a temporary grant for the account that will own the workspace.' },
  { number: '02', title: 'Choose the details', description: 'Choose who can sign in, then optionally add a custom domain and workspace mail.' },
  { number: '03', title: 'Install and open', description: 'The installer provisions everything and opens the workspace through Cloudflare Access.' },
]

const provisioned = [
  'One Worker running the whole application',
  'A D1 database for messages, mail, tasks, and records',
  'An R2 bucket for attachments and raw email',
  'A KV namespace for short-lived connection tickets',
  'Durable Objects, Workflows, Containers, and Workers AI bindings',
  'A protected workers.dev address or an optional custom hostname',
  'Cloudflare Access with email one-time codes, by default',
  'Email Routing and a first mailbox, when workspace mail is on',
]

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
      <UContainer class="py-14 sm:py-20">
        <div class="mx-auto max-w-2xl">
          <p class="text-sm font-medium text-primary">Cloudflare installer</p>
          <h1 class="display-title mt-3 text-4xl font-semibold text-highlighted sm:text-6xl">
            {{ isUpgrade ? 'Upgrade Discoflare' : 'Deploy Discoflare' }}
          </h1>
          <template v-if="isUpgrade">
            <p class="mt-4 max-w-xl text-sm text-muted">
              Connect the Cloudflare account that owns {{ upgradeOrigin }}. The installer will reuse its current storage and apply every pending D1 migration before deploying the release.
            </p>
            <p v-if="upgradeTarget" class="mt-2 max-w-xl text-sm text-muted">Target release: Discoflare {{ upgradeTarget.replace(/^v/, '') }}.</p>
          </template>
          <template v-else>
            <p class="mt-4 max-w-xl text-base leading-7 text-muted">
              One guided pass creates the whole workspace—chat, mail, databases, tasks, and agents—in your own Cloudflare account. The software is free; you pay Cloudflare for what it uses.
            </p>

            <ul class="mt-8 space-y-4">
              <li v-for="requirement in requirements" :key="requirement.label" class="flex gap-3">
                <UIcon :name="requirement.icon" class="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p class="text-sm font-medium text-highlighted">{{ requirement.label }}</p>
                  <p class="mt-0.5 text-sm leading-6 text-muted">{{ requirement.note }}</p>
                </div>
              </li>
            </ul>
          </template>

          <ClientOnly>
            <div v-if="status === 'pending'" class="mt-10 flex items-center gap-3 text-muted">
              <UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />
              Checking Cloudflare connection
            </div>

            <div v-else-if="!session.connected">
              <div class="mt-10 grid gap-3 sm:grid-cols-2">
                <UButton
                  :to="oauthStartUrl"
                  external
                  label="Connect Cloudflare"
                  trailing-icon="i-ph-arrow-right"
                  size="xl"
                  block
                />
                <UButton
                  v-if="!isUpgrade"
                  :to="githubDeployUrl"
                  target="_blank"
                  label="Deploy with GitHub"
                  trailing-icon="i-ph-arrow-up-right"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  block
                />
              </div>

              <div class="mt-5 flex items-start gap-3 rounded-xl border border-default bg-elevated p-4">
                <UIcon name="i-ph-shield-check" class="mt-0.5 size-5 shrink-0 text-primary" />
                <div class="text-sm leading-6 text-muted">
                  <p class="font-medium text-highlighted">The grant is temporary</p>
                  <p class="mt-1">
                    The access token stays in this installer session, expires on its own, and is never written into the deployed Worker. Disconnect at any point to drop it immediately.
                  </p>
                  <p v-if="!isUpgrade" class="mt-2">
                    Cloudflare asks for email permission up front. Leaving <span class="text-default">Workspace email</span> off simply means the installer never touches your email routing.
                  </p>
                </div>
              </div>

              <template v-if="!isUpgrade">
                <section class="mt-14">
                  <h2 class="text-lg font-semibold text-highlighted">How the install goes</h2>
                  <ol class="mt-6 space-y-6">
                    <li v-for="step in installerSteps" :key="step.number" class="flex gap-5">
                      <span class="font-mono text-sm text-primary">{{ step.number }}</span>
                      <div>
                        <h3 class="text-sm font-medium text-highlighted">{{ step.title }}</h3>
                        <p class="mt-1 text-sm leading-6 text-muted">{{ step.description }}</p>
                      </div>
                    </li>
                  </ol>
                </section>

                <section class="mt-12 rounded-2xl border border-muted p-6 sm:p-8">
                  <h2 class="text-lg font-semibold text-highlighted">What it creates in your account</h2>
                  <p class="mt-2 text-sm leading-6 text-muted">
                    Everything below is provisioned in the Cloudflare account you select, and stays yours. An existing Discoflare Worker is updated in place, keeping its data.
                  </p>
                  <ul class="mt-5 grid gap-2.5 sm:grid-cols-2">
                    <li v-for="item in provisioned" :key="item" class="flex items-start gap-2 text-sm leading-6 text-toned">
                      <UIcon name="i-ph-check-circle" class="mt-1 size-4 shrink-0 text-primary" />
                      {{ item }}
                    </li>
                  </ul>
                </section>

                <section class="mt-12 border-t border-muted pt-8">
                  <h2 class="text-sm font-medium text-highlighted">Prefer to own a fork?</h2>
                  <p class="mt-2 text-sm leading-6 text-muted">
                    The GitHub route builds from source through Workers Builds. It is a manual path: you create the Cloudflare resources and configure every binding, secret, hostname, and migration yourself, then verify the deployed Worker.
                    <NuxtLink to="/docs/getting-started/deployment-options" class="text-primary hover:underline">Compare both paths</NuxtLink>.
                  </p>
                </section>
              </template>
            </div>

            <form v-else class="mt-10 space-y-8" @submit.prevent="deploy">
            <UCard :ui="{ body: 'space-y-5 p-6 sm:p-8' }">
              <div class="flex items-center justify-between gap-4">
                <h2 class="text-lg font-semibold text-highlighted">Cloudflare</h2>
                <UButton type="button" label="Disconnect" color="neutral" variant="ghost" size="sm" @click="disconnect" />
              </div>

              <div v-if="isUpgrade">
                <div v-if="installationLoading" class="flex items-center gap-3 py-3 text-sm text-muted">
                  <UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />
                  Finding this installation
                </div>
                <UAlert v-else-if="installationError" color="error" :title="installationError" />
                <div v-else-if="installation" class="rounded-lg border border-default bg-elevated p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-highlighted">{{ installation.configuration.appName }}</p>
                      <p class="mt-1 text-sm text-muted">{{ installation.origin }}</p>
                    </div>
                    <UBadge
                      :label="installation.version ? `Discoflare ${installation.version}` : 'Legacy installation'"
                      color="neutral"
                      variant="subtle"
                    />
                  </div>
                  <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt class="text-xs text-muted">Worker</dt>
                      <dd class="mt-0.5 text-default">{{ installation.workerName }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-muted">Storage</dt>
                      <dd class="mt-0.5 text-default">Existing D1, R2, and KV</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <template v-else>
              <UFormField label="Account" required>
                <USelect
                  v-model="form.accountId"
                  :items="session.accounts.map(account => ({ label: account.name, value: account.id }))"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Worker name" required hint="Existing Discoflare Workers are updated in place.">
                <UInput v-model="form.workerName" autocomplete="off" class="w-full" />
              </UFormField>

              <UFormField label="Workspace name" required>
                <UInput v-model="form.appName" autocomplete="organization" class="w-full" />
              </UFormField>

              <UFormField label="Sign-in" required>
                <URadioGroup
                  v-model="form.authMode"
                  :items="[
                    { label: 'Cloudflare Access — email code', value: 'access' },
                    { label: 'Discoflare accounts — password or OAuth', value: 'builtin' },
                  ]"
                />
              </UFormField>

              <UAlert
                v-if="form.authMode === 'access'"
                color="neutral"
                variant="subtle"
                title="Cloudflare handles the login"
                description="The installer creates an Access application and allows the owner email below. Cloudflare sends the one-time code from its own notification service."
              />

              <UFormField v-if="form.authMode === 'access'" label="Also allow these emails" hint="Optional, comma-separated. You can edit the policy later in Cloudflare Zero Trust.">
                <UInput v-model="allowedEmailsText" type="text" autocomplete="off" class="w-full" placeholder="friend@example.com, teammate@example.com" />
              </UFormField>

              <USwitch
                v-model="form.customDomainEnabled"
                label="Custom domain"
                description="Otherwise the workspace uses your account's workers.dev address."
              />

              <UFormField v-if="form.customDomainEnabled || form.mailEnabled" label="Domain" required hint="Must be active in the selected Cloudflare account.">
                <USelect
                  v-model="form.zoneId"
                  :items="accountZones.map(zone => ({ label: zone.name, value: zone.id }))"
                  value-key="value"
                  class="w-full"
                  placeholder="Select a domain"
                />
              </UFormField>

              <div v-if="form.customDomainEnabled" class="grid gap-5 sm:grid-cols-2">
                <UFormField label="Discoflare subdomain" required>
                  <UInput v-model="form.appSubdomain" autocomplete="off" class="w-full">
                    <template #trailing><span v-if="form.zoneName" class="text-xs text-muted">.{{ form.zoneName }}</span></template>
                  </UInput>
                </UFormField>
              </div>

              <USwitch
                v-model="form.mailEnabled"
                label="Workspace email"
                description="Create a mailbox and assign this domain's catch-all email route to this workspace."
              />

              <div v-if="form.mailEnabled" class="grid gap-5 sm:grid-cols-2">
                <UFormField label="Email subdomain" required>
                  <UInput v-model="form.mailSubdomain" autocomplete="off" class="w-full">
                    <template #trailing><span v-if="form.zoneName" class="text-xs text-muted">.{{ form.zoneName }}</span></template>
                  </UInput>
                </UFormField>
                <UFormField label="First mailbox" required>
                  <UInput v-model="form.mailLocalPart" autocomplete="off" class="w-full">
                    <template #trailing><span v-if="mailDomain" class="text-xs text-muted">@{{ mailDomain }}</span></template>
                  </UInput>
                </UFormField>
              </div>

              <UAlert
                v-if="form.zoneName && form.mailEnabled"
                color="warning"
                variant="subtle"
                :title="`Email for ${mailDomain} will be handled by Discoflare`"
                :description="`The installer enables Cloudflare Email Routing and creates ${mailboxAddress}. Existing non-Cloudflare MX or catch-all routes stop installation instead of being replaced.`"
              />
              <UAlert
                v-else-if="form.zoneName && form.customDomainEnabled"
                color="neutral"
                variant="subtle"
                title="Email routing stays unchanged"
                description="No mailbox or email bindings are created. Existing routes, including another workspace's catch-all, remain untouched."
              />

              <UFormField v-if="form.authMode === 'builtin'" label="Registration" required>
                <URadioGroup
                  v-model="form.registrationMode"
                  :items="[
                    { label: 'Invite only', value: 'invite_only' },
                    { label: 'Open signup', value: 'open' },
                  ]"
                />
              </UFormField>
              </template>
            </UCard>

            <UCard v-if="!isUpgrade" :ui="{ body: 'space-y-5 p-6 sm:p-8' }">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">First owner</h2>
                <p class="mt-1 text-sm text-muted">
                  {{ form.authMode === 'access' ? 'This address signs in first and becomes the workspace owner. Cloudflare sends the one-time code.' : 'After installation, the owner creates their name and password on the workspace domain.' }}
                </p>
              </div>
              <UFormField label="Email" required>
                <UInput v-model="form.adminEmail" type="email" autocomplete="email" class="w-full" />
              </UFormField>
            </UCard>

            <UAlert v-if="error" color="error" variant="subtle" :title="error" />
            <UAlert v-if="result" color="success" variant="subtle" :title="result.updated ? `Updated to Discoflare ${result.version}` : `Installed Discoflare ${result.version}`">
              <template #description>
                <p>Workspace health and deployed version verified.</p>
                <p v-if="result.appliedMigrations.length">
                  Applied {{ result.appliedMigrations.length }} D1 {{ result.appliedMigrations.length === 1 ? 'migration' : 'migrations' }}: {{ result.appliedMigrations.join(', ') }}.
                </p>
                <p v-else>No D1 migrations were pending.</p>
              </template>
              <template #actions>
                <UButton :to="result.setupUrl || result.url" target="_blank" :label="result.updated || !result.setupUrl ? 'Open workspace' : 'Create workspace owner'" trailing-icon="i-ph-arrow-up-right" color="success" variant="solid" />
              </template>
            </UAlert>

            <div class="flex flex-col gap-3 sm:flex-row">
              <UButton
                type="submit"
                :label="isUpgrade ? `Upgrade${upgradeTarget ? ` to ${upgradeTarget.replace(/^v/, '')}` : ''}` : 'Install or update'"
                trailing-icon="i-ph-cloud-arrow-up"
                size="xl"
                :loading="deploying"
                :disabled="isUpgrade ? !installation : (!form.accountId || ((form.customDomainEnabled || form.mailEnabled) && !form.zoneId) || (form.customDomainEnabled && !form.appSubdomain) || (form.mailEnabled && (!form.mailSubdomain || !form.mailLocalPart)) || !form.adminEmail)"
              />
              <UButton
                v-if="!isUpgrade"
                :to="githubDeployUrl"
                target="_blank"
                label="Deploy with GitHub"
                trailing-icon="i-ph-arrow-up-right"
                color="neutral"
                variant="outline"
                size="xl"
              />
              <UButton
                v-else
                :to="upgradeOrigin"
                external
                label="Back to workspace"
                trailing-icon="i-ph-arrow-up-right"
                color="neutral"
                variant="outline"
                size="xl"
              />
            </div>
            </form>

            <template #fallback>
              <div class="mt-10 flex items-center gap-3 text-muted">
                <UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />
                Checking Cloudflare connection
              </div>
            </template>
          </ClientOnly>
        </div>
      </UContainer>
    </main>
  </div>
</template>
