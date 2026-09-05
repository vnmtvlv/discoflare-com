<script setup lang="ts">
/**
 * Hero gallery: one screenshot per released workspace surface.
 *
 * To add or replace a shot, drop a 1600x1000 JPG at the `src` path below and
 * remove that surface's `pending` flag. A surface still marked `pending` — or
 * whose file fails to load — keeps its tab and shows the placeholder image, so
 * the gallery never renders a broken image or loses a button.
 * See public/screenshots/README.md.
 */
const placeholder = {
  src: '/screenshots/chat.jpg',
  alt: 'Discoflare chat with a channel message, an attachment, and a discussion thread open',
}

const surfaces = [
  {
    id: 'chat',
    label: 'Chat',
    icon: 'i-ph-chats-circle',
    src: '/screenshots/chat.jpg',
    alt: 'Discoflare chat with a channel message, an attachment, and a discussion thread open',
  },
  {
    id: 'mail',
    label: 'Mail',
    icon: 'i-ph-envelope-simple',
    src: '/screenshots/mail.jpg',
    alt: 'Discoflare Mail showing a shared domain mailbox and an email conversation',
    pending: true,
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: 'i-ph-robot',
    src: '/screenshots/agents.jpg',
    alt: 'Discoflare agent answering in a channel with its activity state visible',
    pending: true,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'i-ph-list-checks',
    src: '/screenshots/tasks.jpg',
    alt: 'Discoflare Tasks board with columns and a running agent task',
    pending: true,
  },
  {
    id: 'databases',
    label: 'Databases',
    icon: 'i-ph-table',
    src: '/screenshots/databases.jpg',
    alt: 'Discoflare database with typed custom fields and records in a table',
    pending: true,
  },
] as const

type SurfaceId = (typeof surfaces)[number]['id']

/** Filled at runtime when an image 404s, so a missing file falls back instead of breaking the hero. */
const failed = ref(new Set<SurfaceId>())

const activeId = ref<SurfaceId>(surfaces[0].id)
const activeSurface = computed(() => surfaces.find(surface => surface.id === activeId.value) ?? surfaces[0])

/** A pending or broken surface borrows the placeholder, alt text included. */
const activeImage = computed(() => {
  const surface = activeSurface.value
  const usePlaceholder = ('pending' in surface && surface.pending) || failed.value.has(surface.id)
  return usePlaceholder ? placeholder : { src: surface.src, alt: surface.alt }
})

function onImageError(id: SurfaceId) {
  failed.value = new Set(failed.value).add(id)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default bg-elevated shadow-2xl shadow-primary/10">
    <div class="aspect-[8/5] overflow-hidden bg-[#292a2e]">
      <Transition name="hero-screenshot" mode="out-in">
        <img
          :key="activeSurface.id"
          :src="activeImage.src"
          :alt="activeImage.alt"
          width="1600"
          height="1000"
          class="size-full object-contain"
          decoding="async"
          fetchpriority="high"
          @error="onImageError(activeSurface.id)"
        >
      </Transition>
    </div>

    <div
      class="flex items-center justify-center gap-1.5 overflow-x-auto border-t border-default p-2 sm:gap-2 sm:p-3"
      role="group"
      aria-label="Product screenshots"
    >
      <button
        v-for="surface in surfaces"
        :key="surface.id"
        type="button"
        :aria-pressed="activeId === surface.id"
        class="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3"
        :class="activeId === surface.id
          ? 'bg-accented text-highlighted'
          : 'text-muted hover:bg-muted hover:text-highlighted'"
        @click="activeId = surface.id"
      >
        <UIcon :name="surface.icon" class="hidden size-3.5 sm:block" />
        {{ surface.label }}
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
