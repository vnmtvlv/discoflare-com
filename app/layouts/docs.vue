<script setup lang="ts">
const repoUrl = 'https://github.com/vnmtvlv/discoflare'

const { data: navigation } = await useAsyncData('docs-navigation', () => queryCollectionNavigation('docs'))
const { data: searchSections } = await useAsyncData('docs-search-sections', () => queryCollectionSearchSections('docs'))

const docsNavigation = computed(() => {
  const root = navigation.value?.find(item => item.path === '/docs')
  return root?.children || navigation.value || []
})
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <UHeader
      to="/docs"
      title="Discoflare Docs"
      :menu="{ title: 'Documentation navigation', description: 'Browse the Discoflare documentation.' }"
      class="border-b border-muted/70 bg-default/80 backdrop-blur-xl"
    >
      <template #title>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-2.5">
            <img src="/brand/logo-128.png" alt="" class="size-8" width="32" height="32">
            <span class="text-lg font-semibold tracking-tight text-highlighted">Discoflare</span>
          </span>
          <span class="h-5 w-px bg-muted" />
          <span class="text-sm font-medium text-muted">Docs</span>
        </div>
      </template>

      <template #right>
        <UContentSearchButton :collapsed="true" />
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
      </template>

      <template #body>
        <UContentNavigation :navigation="docsNavigation" highlight class="-mx-2.5" />
        <USeparator class="my-5" />
        <UButton to="/" label="Back to Discoflare" trailing-icon="i-ph-arrow-left" color="neutral" variant="ghost" block />
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <UPage>
          <template #left>
            <UPageAside>
              <UContentNavigation :navigation="docsNavigation" highlight />
            </UPageAside>
          </template>

          <slot />
        </UPage>
      </UContainer>
    </UMain>

    <UFooter class="border-t border-muted">
      <template #left><BrandLogo /></template>
      <p class="text-xs text-muted">Documentation for released Discoflare behavior.</p>
      <template #right>
        <UButton to="/" label="Home" color="neutral" variant="ghost" />
      </template>
    </UFooter>

    <UContentSearch
      title="Search documentation"
      description="Find setup steps, environment variables, and operational checks."
      :navigation="docsNavigation"
      :files="searchSections || []"
    />
  </div>
</template>
