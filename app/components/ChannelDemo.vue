<template>
  <div class="flex h-full flex-col">
    <div class="mb-5 flex items-center justify-between border-b border-muted pb-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-hash" class="text-muted" />
        <strong class="text-sm">launch</strong>
      </div>
      <div class="flex -space-x-2">
        <span v-for="name in ['A', 'J', 'M']" :key="name" class="flex size-7 items-center justify-center rounded-full border-2 border-elevated bg-primary/15 text-[10px] text-primary">{{ name }}</span>
      </div>
    </div>
    <div class="flex flex-1 flex-col justify-center gap-4">
      <div class="max-w-[85%] rounded-xl bg-muted p-3 text-xs leading-5 text-toned">The release notes are ready for review.</div>
      <div class="ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2.5 text-xs leading-5 text-inverted">Looks good. I left one comment in the thread.</div>
      <div class="ml-6 flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-ph-arrow-bend-down-right" />
        3 replies · 2 minutes ago
      </div>
    </div>
  </div>
</template>
