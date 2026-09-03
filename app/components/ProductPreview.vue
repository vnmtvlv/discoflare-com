<script setup lang="ts">
const channels = [
  { icon: 'i-ph-hash', name: 'general', active: true },
  { icon: 'i-ph-hash', name: 'product' },
  { icon: 'i-ph-speaker-high', name: 'huddle' },
]

const messages = [
  { initials: 'AM', name: 'Amina', time: '10:14', body: 'The new workspace is live. Everything is running in our Cloudflare account.' },
  { initials: 'JL', name: 'Jon', time: '10:16', body: 'Nice. Starting a thread for launch notes.', reaction: '🔥  4' },
  { initials: 'SK', name: 'Sam', time: '10:18', body: 'I’ll jump into the huddle in five.' },
]
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-2xl shadow-primary/10">
    <div class="flex h-11 items-center gap-2 border-b border-default px-4">
      <span class="size-2.5 rounded-full bg-error" />
      <span class="size-2.5 rounded-full bg-warning" />
      <span class="size-2.5 rounded-full bg-success" />
      <span class="ml-3 text-xs text-dimmed">team.example.com</span>
    </div>

    <div class="grid min-h-[30rem] grid-cols-[76px_1fr] sm:min-h-[32rem] sm:grid-cols-[210px_1fr]">
      <aside class="border-r border-default bg-muted/70 p-3">
        <div class="mb-5 flex items-center gap-2 px-2">
          <img src="/brand/logo-128.png" alt="" class="size-7" width="28" height="28">
          <span class="hidden truncate text-sm font-semibold sm:block">Acme workspace</span>
        </div>
        <p class="mb-2 hidden px-2 text-[10px] font-medium uppercase tracking-widest text-dimmed sm:block">Channels</p>
        <div class="space-y-1">
          <div
            v-for="channel in channels"
            :key="channel.name"
            class="flex items-center gap-2 rounded-lg px-2 py-2 text-sm"
            :class="channel.active ? 'bg-accented text-highlighted' : 'text-muted'"
          >
            <UIcon :name="channel.icon" class="size-4 shrink-0" />
            <span class="hidden sm:block">{{ channel.name }}</span>
          </div>
        </div>
      </aside>

      <section class="flex min-w-0 flex-col">
        <header class="flex h-14 items-center gap-2 border-b border-default px-4">
          <UIcon name="i-ph-hash" class="size-5 text-dimmed" />
          <strong class="text-sm">general</strong>
          <span class="hidden text-xs text-muted sm:inline">Company-wide updates</span>
        </header>
        <div class="flex-1 space-y-5 p-4 sm:p-6">
          <div v-for="message in messages" :key="message.time" class="flex gap-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-[10px] font-semibold text-primary">
              {{ message.initials }}
            </div>
            <div class="min-w-0">
              <div class="flex items-baseline gap-2">
                <strong class="text-sm">{{ message.name }}</strong>
                <span class="text-[10px] text-dimmed">{{ message.time }}</span>
              </div>
              <p class="mt-1 text-xs leading-5 text-toned sm:text-sm">{{ message.body }}</p>
              <span v-if="message.reaction" class="mt-2 inline-flex rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs text-primary">
                {{ message.reaction }}
              </span>
            </div>
          </div>
        </div>
        <div class="mx-4 mb-4 flex h-11 items-center rounded-xl border border-default bg-default px-3 text-xs text-dimmed sm:mx-6">
          Message #general
          <UIcon name="i-ph-paper-plane-tilt" class="ml-auto size-4" />
        </div>
      </section>
    </div>
  </div>
</template>
