<script setup lang="ts">
import type { AccordionItem, NavigationMenuItem } from '@nuxt/ui'

const repoUrl = 'https://github.com/vnmtvlv/discoflare'
const creatorUrl = 'https://github.com/vnmtvlv'
const deployUrl = 'https://deploy.workers.cloudflare.com/?url=https://github.com/vnmtvlv/discoflare'
const installerUrl = '/deploy'
const sandboxUrl = 'https://sandbox.discoflare.com'
const siteUrl = 'https://discoflare.com/'
const websiteId = `${siteUrl}#website`
const organizationId = `${siteUrl}#organization`
const softwareId = `${siteUrl}#software`
const logoUrl = 'https://discoflare.com/brand/logo-256.png'
const socialImageUrl = 'https://discoflare.com/og-image.png'
const pageTitle = 'Discoflare — Team chat on your Cloudflare account'
const pageDescription = 'Open-source, self-hosted team chat for channels, threads, files, and huddles—running in your Cloudflare account.'

const navigation = computed<NavigationMenuItem[]>(() => [
  { label: 'Features', to: '#features' },
  { label: 'Agents', to: '#agents' },
  { label: 'Deploy', to: '#deploy' },
  { label: 'Docs', to: '/docs' },
  { label: 'Pricing', to: '#pricing' },
  { label: 'FAQ', to: '#faq' },
])

const sectionIds = ['features', 'agents', 'deploy', 'pricing', 'faq'] as const
let scrollFrame: number | undefined

function syncHashToScroll() {
  const activeSection = sectionIds.findLast((sectionId) => {
    const section = document.getElementById(sectionId)
    return section ? section.getBoundingClientRect().top <= 96 : false
  })
  const nextHash = activeSection ? `#${activeSection}` : ''

  if (window.location.hash === nextHash) return

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${nextHash}`,
  )
}

function scheduleHashSync() {
  if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = undefined
    syncHashToScroll()
  })
}

onMounted(() => {
  window.addEventListener('scroll', scheduleHashSync, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleHashSync)
  if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)
})

const features = [
  {
    icon: 'i-ph-cloud',
    title: 'Your Cloudflare account',
    description: 'The Worker, database, files, and live connections run in infrastructure you control.',
  },
  {
    icon: 'i-ph-lightning',
    title: 'Real-time channels',
    description: 'Public and private channels with replies, threads, reactions, mentions, typing, and presence.',
  },
  {
    icon: 'i-ph-headphones',
    title: 'Voice huddles',
    description: 'Start a huddle from a voice channel with Cloudflare RealtimeKit.',
  },
  {
    icon: 'i-ph-folder-open',
    title: 'Files stay with you',
    description: 'Attachments are stored in an R2 bucket inside your Cloudflare account.',
  },
  {
    icon: 'i-ph-shield-check',
    title: 'Workspace controls',
    description: 'Invite members, assign roles, manage permissions, and review audit history.',
  },
  {
    icon: 'i-ph-code',
    title: 'Open source',
    description: 'Read the code, run it yourself, and adapt it under the MIT license.',
  },
]

const deploySteps = [
  { number: '01', title: 'Connect Cloudflare', description: 'Choose the Cloudflare account that will own the workspace.' },
  { number: '02', title: 'Install or update', description: 'Discoflare provisions the Worker and its Cloudflare resources.' },
  { number: '03', title: 'Open your workspace', description: 'Create the first owner on the configured workspace hostname.' },
]

const faqItems: AccordionItem[] = [
  {
    label: 'What do I need to run Discoflare?',
    content: 'A Cloudflare account with the Workers Paid plan. The Discoflare installer does not require GitHub. The alternative repository-based flow requires a GitHub account and manual Cloudflare resource, binding, secret, hostname, and migration setup. Voice huddles require separate RealtimeKit configuration.',
  },
  {
    label: 'Is Discoflare free?',
    content: 'The software is free and MIT licensed. Cloudflare services and RealtimeKit, when enabled, are billed by their providers according to your usage and plan.',
  },
  {
    label: 'Where is workspace data stored?',
    content: 'Messages and workspace data use D1, attachments use R2, and short-lived connection tickets use KV. These resources live in the Cloudflare account used for deployment.',
  },
  {
    label: 'What runs the agents?',
    content: 'Agents use Workers AI through the deployment\'s own AI binding. An agent profile stores a model id rather than a vendor key, so the workspace does not depend on an external AI provider account. Agent sandboxes use Cloudflare Containers, which is why the Workers Paid plan is required.',
  },
  {
    label: 'How are Agent actions controlled?',
    content: 'In Agent conversations, risky commands pause until an authorized member approves or rejects them. Agents are workspace members rather than sign-in identities, and configuring them requires workspace administration permission.',
  },
  {
    label: 'Can I try it before deploying?',
    content: 'Yes. The public sandbox is the official pilot workspace. Use it to get a feel for Discoflare before creating your own deployment.',
  },
  {
    label: 'Does team chat depend on voice configuration?',
    content: 'No. Text chat works without RealtimeKit. Huddles remain unavailable until the optional voice integration is configured.',
  },
  {
    label: 'Are native apps available?',
    content: 'Not yet. Desktop, iOS, and Android clients are planned for later; the current release is the web application.',
  },
]

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  author: 'vnmtvlv',
  applicationName: 'Discoflare',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: siteUrl,
  ogSiteName: 'Discoflare',
  ogLocale: 'en_US',
  ogImage: socialImageUrl,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: 'Discoflare — team chat on your Cloudflare account',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: socialImageUrl,
  twitterImageAlt: 'Discoflare — team chat on your Cloudflare account',
})

useHead({
  link: [
    { rel: 'canonical', href: siteUrl },
    { rel: 'alternate', type: 'text/markdown', href: 'https://discoflare.com/index.md' },
  ],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': websiteId,
          url: siteUrl,
          name: 'Discoflare',
          description: pageDescription,
          publisher: { '@id': organizationId },
        },
        {
          '@type': 'Organization',
          '@id': organizationId,
          name: 'Discoflare',
          url: siteUrl,
          logo: {
            '@type': 'ImageObject',
            '@id': `${siteUrl}#logo`,
            url: logoUrl,
            contentUrl: logoUrl,
            width: 256,
            height: 256,
          },
        },
        {
          '@type': 'SoftwareApplication',
          '@id': softwareId,
          name: 'Discoflare',
          url: siteUrl,
          image: socialImageUrl,
          description: pageDescription,
          applicationCategory: 'CommunicationApplication',
          operatingSystem: 'Web',
          license: 'https://opensource.org/license/mit',
          isPartOf: { '@id': websiteId },
          publisher: { '@id': organizationId },
          sameAs: repoUrl,
          author: {
            '@type': 'Person',
            name: 'vnmtvlv',
            url: creatorUrl,
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
      ],
    }),
  }],
})
</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-default text-default">
    <UHeader to="/" title="Discoflare" class="border-b border-muted/70 bg-default/80 backdrop-blur-xl">
      <template #title>
        <BrandLogo :linked="false" />
      </template>

      <UNavigationMenu :items="navigation" class="hidden lg:flex" />

      <template #right>
        <UColorModeButton color="neutral" variant="ghost" />
        <UButton
          :to="repoUrl"
          target="_blank"
          label="GitHub"
          icon="i-ph-github-logo"
          color="neutral"
          variant="ghost"
          class="hidden sm:inline-flex"
        />
        <UButton :to="sandboxUrl" target="_blank" label="Try sandbox" color="neutral" variant="outline" />
      </template>

      <template #body>
        <UNavigationMenu :items="navigation" orientation="vertical" class="-mx-2.5" />
        <UButton :to="repoUrl" target="_blank" label="GitHub" icon="i-ph-github-logo" color="neutral" variant="ghost" class="mt-4 w-full justify-center" />
      </template>
    </UHeader>

    <main>
      <section class="relative border-b border-muted py-20 sm:py-28 lg:py-32">
        <div class="noise-grid pointer-events-none absolute inset-0 -z-10" />
        <div class="orange-glow pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-3/4 -translate-x-1/2 blur-3xl" />
        <UContainer>
          <div class="mx-auto max-w-4xl text-center">
            <UBadge color="neutral" variant="outline" class="mb-7" icon="i-ph-code">
              Open source · MIT licensed
            </UBadge>
            <h1 class="display-title text-5xl font-semibold leading-[1.02] text-highlighted sm:text-7xl lg:text-8xl">
              One workspace for humans, agents, and tasks.
            </h1>
            <p class="mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Self-host Discoflare in your Cloudflare account—channels, threads, files, and huddles, without an origin server.
            </p>
            <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <UButton
                :to="installerUrl"
                label="Deploy to Cloudflare"
                trailing-icon="i-ph-arrow-right"
                size="xl"
              />
              <UButton
                :to="sandboxUrl"
                target="_blank"
                label="Open the sandbox"
                icon="i-ph-play-circle"
                color="neutral"
                variant="outline"
                size="xl"
              />
            </div>
            <p class="mt-4 text-xs text-dimmed">Cloudflare usage is billed by Cloudflare.</p>
          </div>

          <div class="relative mx-auto mt-16 max-w-6xl sm:mt-20">
            <div class="orange-glow pointer-events-none absolute -inset-24 -z-10 blur-3xl" />
            <ProductPreview />
          </div>
        </UContainer>
      </section>

      <section id="features" class="scroll-mt-16 border-b border-muted py-20 sm:py-28">
        <UContainer>
          <div class="max-w-2xl">
            <p class="mb-3 text-sm font-medium text-primary">Built for one workspace</p>
            <h2 class="display-title text-4xl font-semibold text-highlighted sm:text-5xl">Chat infrastructure without the chat vendor.</h2>
          </div>
          <div class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-muted bg-muted sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="feature in features" :key="feature.title" class="bg-default p-7 sm:p-8">
              <UIcon :name="feature.icon" class="size-6 text-primary" />
              <h3 class="mt-6 font-semibold text-highlighted">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ feature.description }}</p>
            </article>
          </div>
        </UContainer>
      </section>

      <section class="border-b border-muted">
        <UContainer>
          <DemoPanel
            eyebrow="Channels and threads"
            title="Keep the conversation close to the work."
            description="Organize discussion in public or private channels. Reply in place, move details into threads, add reactions, and see who is around."
            icon="i-ph-chats-circle"
          >
            <ChannelDemo />
          </DemoPanel>

          <div class="border-t border-muted" />

          <div id="agents" class="scroll-mt-16">
            <DemoPanel
              eyebrow="Agents"
              title="Agents are members, not integrations."
              description="Mention an agent in a channel or send it a direct message, and it answers in place. Each channel and thread keeps its own memory, so one conversation never leaks into another."
              icon="i-ph-robot"
              reverse
            >
              <AgentDemo />
            </DemoPanel>
          </div>

          <div class="border-t border-muted" />

          <DemoPanel
            eyebrow="Tasks"
            title="Hand off work that outlives the message."
            description="Assign a task and every run executes as a durable Cloudflare Workflow—resumable after interruption, cancellable while running, and recorded with its configuration, progress, and result."
            icon="i-ph-list-checks"
          >
            <TaskDemo />
          </DemoPanel>

          <div class="border-t border-muted" />

          <DemoPanel
            eyebrow="Voice huddles"
            title="Move from typing to talking."
            description="Start a voice huddle from a channel when text is not enough. RealtimeKit carries the media while Discoflare keeps the workspace context."
            icon="i-ph-waveform"
            reverse
          >
            <HuddleDemo />
          </DemoPanel>
        </UContainer>
      </section>

      <section id="deploy" class="scroll-mt-16 border-b border-muted py-20 sm:py-28">
        <UContainer>
          <div class="grid items-start gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
            <div>
              <p class="mb-3 text-sm font-medium text-primary">Cloudflare deployment</p>
              <h2 class="display-title text-4xl font-semibold text-highlighted sm:text-5xl">Your workspace. Your account.</h2>
              <p class="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Discoflare deploys as one Nuxt Worker and connects the Cloudflare services declared by the project.
              </p>
              <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                <UButton :to="installerUrl" label="Deploy with Discoflare" trailing-icon="i-ph-arrow-right" size="lg" />
                <UButton :to="deployUrl" target="_blank" label="Deploy with GitHub" trailing-icon="i-ph-arrow-up-right" color="neutral" variant="outline" size="lg" />
              </div>
              <p class="mt-3 max-w-xl text-sm leading-6 text-muted">The GitHub method connects source to Workers Builds. You configure and verify every account-specific Cloudflare resource, binding, secret, hostname, and migration manually.</p>
            </div>

            <div>
              <div class="mb-8 min-h-44 overflow-hidden rounded-2xl border border-default bg-elevated p-6 shadow-xl sm:aspect-video sm:min-h-0 sm:p-8">
                <DeployDemo />
              </div>
              <ol class="space-y-6">
                <li v-for="step in deploySteps" :key="step.number" class="flex gap-5">
                  <span class="font-mono text-sm text-primary">{{ step.number }}</span>
                  <div>
                    <h3 class="font-medium text-highlighted">{{ step.title }}</h3>
                    <p class="mt-1 text-sm leading-6 text-muted">{{ step.description }}</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </UContainer>
      </section>

      <section id="pricing" class="scroll-mt-16 border-b border-muted py-20 sm:py-28">
        <UContainer>
          <div class="mx-auto max-w-3xl text-center">
            <p class="mb-3 text-sm font-medium text-primary">Pricing</p>
            <h2 class="display-title text-4xl font-semibold text-highlighted sm:text-5xl">The software costs nothing.</h2>
            <p class="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Discoflare is free and open source. You pay Cloudflare directly for the infrastructure your workspace uses.
            </p>
          </div>

          <UCard class="mx-auto mt-12 max-w-2xl" :ui="{ body: 'p-7 sm:p-10' }">
            <div class="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
              <div>
                <p class="font-medium text-highlighted">Self-hosted</p>
                <div class="mt-4 flex items-baseline gap-2">
                  <span class="text-5xl font-semibold tracking-tight text-highlighted">$0</span>
                  <span class="text-muted">software license</span>
                </div>
                <ul class="mt-7 space-y-3 text-sm text-toned">
                  <li v-for="item in ['MIT licensed', 'One workspace per deployment', 'No Discoflare subscription']" :key="item" class="flex items-center gap-2">
                    <UIcon name="i-ph-check-circle" class="size-4 text-primary" />
                    {{ item }}
                  </li>
                </ul>
              </div>
              <UButton :to="repoUrl" target="_blank" label="View source" icon="i-ph-github-logo" color="neutral" variant="outline" size="lg" />
            </div>
          </UCard>
        </UContainer>
      </section>

      <section id="faq" class="scroll-mt-16 border-b border-muted py-20 sm:py-28">
        <UContainer>
          <div class="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <p class="mb-3 text-sm font-medium text-primary">FAQ</p>
              <h2 class="display-title text-4xl font-semibold text-highlighted sm:text-5xl">Before you deploy.</h2>
            </div>
            <UAccordion :items="faqItems" type="multiple" :ui="{ item: 'border-b border-muted', label: 'text-base' }" />
          </div>
        </UContainer>
      </section>

      <section class="py-20 sm:py-28">
        <UContainer>
          <div class="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/6 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div class="orange-glow pointer-events-none absolute inset-0 -z-10" />
            <img src="/brand/logo-128.png" alt="" class="mx-auto size-16" width="64" height="64">
            <h2 class="display-title mx-auto mt-6 max-w-2xl text-4xl font-semibold text-highlighted sm:text-5xl">Bring your team chat home.</h2>
            <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <UButton :to="installerUrl" label="Deploy Discoflare" trailing-icon="i-ph-arrow-right" size="xl" />
              <UButton :to="repoUrl" target="_blank" label="Star on GitHub" icon="i-ph-star" color="neutral" variant="outline" size="xl" />
            </div>
          </div>
        </UContainer>
      </section>
    </main>

    <UFooter class="border-t border-muted">
      <template #left>
        <BrandLogo />
      </template>
      <nav aria-label="Legal" class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <NuxtLink to="/docs" class="transition-colors hover:text-highlighted">Docs</NuxtLink>
        <NuxtLink to="/privacy" class="transition-colors hover:text-highlighted">Privacy</NuxtLink>
        <NuxtLink to="/terms" class="transition-colors hover:text-highlighted">Terms</NuxtLink>
        <span>
          by
          <a :href="creatorUrl" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-highlighted">vnmtvlv</a>
        </span>
      </nav>
      <template #right>
        <UButton :to="repoUrl" target="_blank" aria-label="Discoflare on GitHub" icon="i-ph-github-logo" color="neutral" variant="ghost" />
      </template>
    </UFooter>
  </div>
</template>
