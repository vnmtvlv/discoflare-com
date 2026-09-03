<template>
  <div class="flex h-full flex-col items-center justify-center">
    <div class="relative">
      <div class="absolute inset-0 rounded-full bg-primary/25 blur-2xl" />
      <div class="relative flex size-28 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <UIcon name="i-ph-waveform" class="size-12 text-primary" />
      </div>
    </div>
    <p class="mt-6 text-sm font-medium text-highlighted">Product huddle</p>
    <p class="mt-1 text-xs text-muted">3 people connected</p>
    <div class="mt-6 flex gap-3">
      <span class="flex size-10 items-center justify-center rounded-full bg-accented"><UIcon name="i-ph-microphone" /></span>
      <span class="flex size-10 items-center justify-center rounded-full bg-accented"><UIcon name="i-ph-monitor-arrow-up" /></span>
      <span class="flex size-10 items-center justify-center rounded-full bg-error text-inverted"><UIcon name="i-ph-phone-disconnect" /></span>
    </div>
  </div>
</template>
