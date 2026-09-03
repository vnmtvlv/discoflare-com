<script setup lang="ts">
defineProps<{
  title: string
  description: string
  effectiveDate: string
}>()

const creatorUrl = 'https://github.com/vnmtvlv'
const currentYear = new Date().getFullYear()
const copyrightYears = currentYear === 2026 ? '2026' : `2026–${currentYear}`
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <UHeader class="border-b border-muted/70 bg-default/80 backdrop-blur-xl">
      <template #title>
        <BrandLogo />
      </template>

      <template #right>
        <UColorModeButton color="neutral" variant="ghost" />
        <UButton to="/" label="Back home" icon="i-ph-arrow-left" color="neutral" variant="ghost" />
      </template>
    </UHeader>

    <main>
      <UContainer class="py-16 sm:py-24">
        <article class="mx-auto max-w-3xl">
          <p class="text-sm font-medium text-primary">Legal</p>
          <h1 class="display-title mt-3 text-4xl font-semibold text-highlighted sm:text-6xl">{{ title }}</h1>
          <p class="mt-5 max-w-2xl text-lg leading-8 text-muted">{{ description }}</p>
          <p class="mt-4 text-sm text-dimmed">Effective {{ effectiveDate }}</p>

          <div class="legal-content mt-12 space-y-10">
            <slot />
          </div>
        </article>
      </UContainer>
    </main>

    <UFooter class="border-t border-muted">
      <template #left>
        <BrandLogo />
      </template>
      <p class="text-center text-xs text-muted">© {{ copyrightYears }} Discoflare · by <a :href="creatorUrl" target="_blank" rel="noopener noreferrer" class="hover:text-highlighted">vnmtvlv</a></p>
      <template #right>
        <nav aria-label="Legal" class="flex items-center gap-3 text-sm text-muted">
          <NuxtLink to="/privacy" class="hover:text-highlighted">Privacy</NuxtLink>
          <NuxtLink to="/terms" class="hover:text-highlighted">Terms</NuxtLink>
        </nav>
      </template>
    </UFooter>
  </div>
</template>

<style scoped>
.legal-content :deep(section) {
  display: grid;
  gap: 0.75rem;
}

.legal-content :deep(h2) {
  color: var(--ui-text-highlighted);
  font-size: 1.25rem;
  font-weight: 600;
}

.legal-content :deep(p),
.legal-content :deep(li) {
  color: var(--ui-text-muted);
  line-height: 1.75;
}

.legal-content :deep(ul) {
  display: grid;
  gap: 0.5rem;
  padding-left: 1.25rem;
  list-style: disc;
}

.legal-content :deep(a) {
  color: var(--ui-primary);
}

.legal-content :deep(a:hover) {
  text-decoration: underline;
}
</style>
