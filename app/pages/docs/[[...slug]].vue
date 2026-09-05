<script setup lang="ts">
const route = useRoute()

definePageMeta({ layout: 'docs' })

const path = computed(() => route.path.replace(/\/$/, '') || '/docs')
const { data: page } = await useAsyncData(
  () => `docs-page:${path.value}`,
  () => queryCollection('docs').path(path.value).first(),
  { watch: [path] },
)
const { data: surround } = await useAsyncData(
  () => `docs-surround:${path.value}`,
  () => queryCollectionItemSurroundings('docs', path.value, {
    fields: ['description'],
  }),
  { watch: [path] },
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Documentation page not found' })
}

useSeoMeta({
  title: () => `${page.value?.title} · Discoflare Docs`,
  description: () => page.value?.description,
  robots: 'index, follow',
  ogTitle: () => `${page.value?.title} · Discoflare Docs`,
  ogDescription: () => page.value?.description,
  ogType: 'article',
  ogUrl: () => `https://discoflare.com${path.value}`,
  ogSiteName: 'Discoflare',
  ogImage: 'https://discoflare.com/og-image.png',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: () => `https://discoflare.com${path.value}` }],
})
</script>

<template>
  <UPage v-if="page">
    <UPageHeader :title="page.title" :description="page.description" />

    <UPageBody>
      <ContentRenderer :value="page" />

      <USeparator />
      <UContentSurround :surround="surround" />
    </UPageBody>

    <template #right>
      <UContentToc :links="page.body?.toc?.links || []" highlight />
    </template>
  </UPage>
</template>
