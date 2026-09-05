<script setup lang="ts">
import type { DeployRequest, DeployResponse, InstallerSessionResponse } from '../../shared/installer'

const githubDeployUrl = 'https://deploy.workers.cloudflare.com/?url=https://github.com/vnmtvlv/discoflare'
const route = useRoute()
const { data: session, status, refresh } = await useFetch<InstallerSessionResponse>('/api/cloudflare/session', {
  server: false,
  default: () => ({ connected: false, accounts: [], zones: [] }),
})

const form = reactive<DeployRequest>({
  accountId: '',
  workerName: 'discoflare',
  adminEmail: '',
  appName: 'Discoflare',
  registrationMode: 'invite_only',
  zoneId: '',
  zoneName: '',
  appSubdomain: 'discoflare',
  mailSubdomain: 'discoflare',
  mailLocalPart: 'inbox',
})
const deploying = ref(false)
const result = ref<DeployResponse | null>(null)
const error = ref(typeof route.query.error === 'string' ? 'Cloudflare connection was not completed.' : '')

watch(() => session.value.accounts, (accounts) => {
  if (!form.accountId && accounts[0]) form.accountId = accounts[0].id
}, { immediate: true })

const accountZones = computed(() => session.value.zones.filter(zone => zone.accountId === form.accountId && zone.status === 'active'))
const appHostname = computed(() => form.zoneName ? `${form.appSubdomain}.${form.zoneName}` : '')
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
  await refresh()
}

async function deploy() {
  deploying.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await $fetch<DeployResponse>('/api/cloudflare/deploy', { method: 'POST', body: form })
  }
  catch (cause) {
    const value = cause as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    error.value = value.data?.statusMessage || value.statusMessage || value.message || 'Deployment failed.'
  }
  finally {
    deploying.value = false
  }
}

useSeoMeta({
  title: 'Deploy Discoflare',
  description: 'Install or update Discoflare in your Cloudflare account.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <UHeader class="border-b border-muted/70 bg-default/80 backdrop-blur-xl">
      <template #title><BrandLogo /></template>
      <template #right>
        <UColorModeButton color="neutral" variant="ghost" />
        <UButton to="/" label="Back home" trailing-icon="i-ph-arrow-left" color="neutral" variant="ghost" />
      </template>
    </UHeader>

    <main>
      <UContainer class="py-14 sm:py-20">
        <div class="mx-auto max-w-2xl">
          <p class="text-sm font-medium text-primary">Cloudflare installer</p>
          <h1 class="display-title mt-3 text-4xl font-semibold text-highlighted sm:text-6xl">Deploy Discoflare</h1>
          <p class="mt-4 max-w-xl text-sm text-muted">Requires the Cloudflare Workers Paid plan because Discoflare agent sandboxes use Containers.</p>

          <div v-if="status === 'pending'" class="mt-10 flex items-center gap-3 text-muted">
            <UIcon name="i-ph-spinner-gap" class="size-5 animate-spin" />
            Checking Cloudflare connection
          </div>

          <div v-else-if="!session.connected" class="mt-10 grid gap-3 sm:grid-cols-2">
            <UButton
              to="/api/cloudflare/oauth/start?returnTo=/deploy"
              external
              label="Connect Cloudflare"
              trailing-icon="i-ph-arrow-right"
              size="xl"
              block
            />
            <UButton
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

          <form v-else class="mt-10 space-y-8" @submit.prevent="deploy">
            <UCard :ui="{ body: 'space-y-5 p-6 sm:p-8' }">
              <div class="flex items-center justify-between gap-4">
                <h2 class="text-lg font-semibold text-highlighted">Cloudflare</h2>
                <UButton type="button" label="Disconnect" color="neutral" variant="ghost" size="sm" @click="disconnect" />
              </div>

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

              <UFormField label="Domain" required hint="Must be active in the selected Cloudflare account.">
                <USelect
                  v-model="form.zoneId"
                  :items="accountZones.map(zone => ({ label: zone.name, value: zone.id }))"
                  value-key="value"
                  class="w-full"
                  placeholder="Select a domain"
                />
              </UFormField>

              <div class="grid gap-5 sm:grid-cols-2">
                <UFormField label="Discoflare subdomain" required>
                  <UInput v-model="form.appSubdomain" autocomplete="off" class="w-full">
                    <template #trailing><span v-if="form.zoneName" class="text-xs text-muted">.{{ form.zoneName }}</span></template>
                  </UInput>
                </UFormField>
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
                v-if="form.zoneName"
                color="warning"
                variant="subtle"
                :title="`Email for ${mailDomain} will be handled by Discoflare`"
                :description="`The installer enables Cloudflare Email Routing, attaches ${appHostname}, and creates ${mailboxAddress}. Existing non-Cloudflare MX or catch-all routes stop installation instead of being replaced.`"
              />

              <UFormField label="Registration" required>
                <URadioGroup
                  v-model="form.registrationMode"
                  :items="[
                    { label: 'Invite only', value: 'invite_only' },
                    { label: 'Open signup', value: 'open' },
                  ]"
                />
              </UFormField>
            </UCard>

            <UCard :ui="{ body: 'space-y-5 p-6 sm:p-8' }">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">First owner</h2>
                <p class="mt-1 text-sm text-muted">After installation, the owner creates their name and password on the workspace domain.</p>
              </div>
              <UFormField label="Email" required>
                <UInput v-model="form.adminEmail" type="email" autocomplete="email" class="w-full" />
              </UFormField>
            </UCard>

            <UAlert v-if="error" color="error" variant="subtle" :title="error" />
            <UAlert v-if="result" color="success" variant="subtle" :title="result.updated ? `Updated to Discoflare ${result.version}` : `Installed Discoflare ${result.version}`">
              <template #actions>
                <UButton :to="result.setupUrl || result.url" target="_blank" :label="result.updated ? 'Open workspace' : 'Create workspace owner'" trailing-icon="i-ph-arrow-up-right" color="success" variant="solid" />
              </template>
            </UAlert>

            <div class="flex flex-col gap-3 sm:flex-row">
              <UButton
                type="submit"
                label="Install or update"
                trailing-icon="i-ph-cloud-arrow-up"
                size="xl"
                :loading="deploying"
                :disabled="!form.accountId || !form.zoneId || !form.appSubdomain || !form.mailSubdomain || !form.mailLocalPart || !form.adminEmail"
              />
              <UButton
                :to="githubDeployUrl"
                target="_blank"
                label="Deploy with GitHub"
                trailing-icon="i-ph-arrow-up-right"
                color="neutral"
                variant="outline"
                size="xl"
              />
            </div>
          </form>
        </div>
      </UContainer>
    </main>
  </div>
</template>
