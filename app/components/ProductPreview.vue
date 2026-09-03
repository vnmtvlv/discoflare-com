<script setup lang="ts">
const screenshots = [
  {
    label: 'Design review',
    src: '/screenshots/design-review-thread.jpg',
    alt: 'Discoflare design review channel with an attachment and a discussion thread open',
  },
  {
    label: 'Launch',
    src: '/screenshots/launch-coordination.jpg',
    alt: 'Discoflare product launch channel with a reply thread open',
  },
  {
    label: 'Campaign',
    src: '/screenshots/campaign-assets.jpg',
    alt: 'Discoflare marketing channel with campaign artwork shared in chat',
  },
  {
    label: 'Files',
    src: '/screenshots/customer-story-files.jpg',
    alt: 'Discoflare customer stories channel showing shared files',
  },
] as const

const activeIndex = ref(0)
const activeScreenshot = computed(() => screenshots[activeIndex.value] ?? screenshots[0])
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default bg-elevated shadow-2xl shadow-primary/10">
    <div class="aspect-[8/5] overflow-hidden bg-[#292a2e]">
      <Transition name="hero-screenshot" mode="out-in">
        <img
          :key="activeScreenshot.src"
          :src="activeScreenshot.src"
          :alt="activeScreenshot.alt"
          width="1600"
          height="1000"
          class="size-full object-contain"
          decoding="async"
          fetchpriority="high"
        >
      </Transition>
    </div>

    <div
      class="flex items-center justify-center gap-1.5 border-t border-default p-2 sm:gap-2 sm:p-3"
      role="group"
      aria-label="Product screenshots"
    >
      <button
        v-for="(screenshot, index) in screenshots"
        :key="screenshot.src"
        type="button"
        :aria-pressed="activeIndex === index"
        class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3"
        :class="activeIndex === index
          ? 'bg-accented text-highlighted'
          : 'text-muted hover:bg-muted hover:text-highlighted'"
        @click="activeIndex = index"
      >
        {{ screenshot.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero-screenshot-enter-active,
.hero-screenshot-leave-active {
  transition: opacity 150ms ease;
}

.hero-screenshot-enter-from,
.hero-screenshot-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .hero-screenshot-enter-active,
  .hero-screenshot-leave-active {
    transition: none;
  }
}
</style>
