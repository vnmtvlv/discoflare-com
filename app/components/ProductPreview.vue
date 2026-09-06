<script setup lang="ts">
/**
 * Hero gallery: one screenshot per released workspace surface.
 *
 * To add or replace a shot, drop a 1600x1000 JPG at the `src` path below and
 * remove that surface's `pending` flag. A surface marked `pending` — or whose
 * file fails to load — is left out of the gallery entirely rather than shown
 * with a stand-in image, so a visitor never clicks Mail and sees Chat.
 * See public/screenshots/README.md.
 */
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

/** Filled at runtime when an image 404s, so a missing file drops its tab instead of breaking the hero. */
const failed = ref(new Set<SurfaceId>())

/** Only surfaces with a screenshot that actually loads are offered. */
const available = computed(() => surfaces.filter(surface =>
  !('pending' in surface && surface.pending) && !failed.value.has(surface.id),
))

const activeId = ref<SurfaceId | null>(available.value[0]?.id ?? null)
const activeSurface = computed(() =>
  available.value.find(surface => surface.id === activeId.value) ?? available.value[0] ?? null,
)

function onImageError(id: SurfaceId) {
  failed.value = new Set(failed.value).add(id)
}
</script>

<template>
  <div v-if="activeSurface" class="overflow-hidden rounded-lg border border-default bg-elevated shadow-2xl shadow-primary/10">
    <div class="aspect-[8/5] overflow-hidden bg-[#292a2e]">
      <Transition name="hero-screenshot" mode="out-in">
        <img
          :key="activeSurface.id"
          :src="activeSurface.src"
          :alt="activeSurface.alt"
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
      v-if="available.length > 1"
      class="flex items-center justify-center gap-1.5 overflow-x-auto border-t border-default p-2 sm:gap-2 sm:p-3"
      role="group"
      aria-label="Product screenshots"
    >
      <button
        v-for="surface in available"
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
