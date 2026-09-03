<script setup lang="ts">
const siteUrl = 'https://discoflare.com/privacy'
const title = 'Privacy policy · Discoflare'
const description = 'How the Discoflare marketing site handles information.'

useSeoMeta({
  title,
  description,
  robots: 'index, follow',
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: siteUrl,
  ogSiteName: 'Discoflare',
  ogImage: 'https://discoflare.com/og-image.png',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: 'https://discoflare.com/og-image.png',
})

useHead({ link: [{ rel: 'canonical', href: siteUrl }] })
</script>

<template>
  <LegalPage
    title="Privacy policy"
    description="How the Discoflare marketing site handles information."
    effective-date="September 3, 2026"
  >
    <section>
      <h2>What this policy covers</h2>
      <p>This policy covers discoflare.com, the public marketing site. A Discoflare workspace that you deploy, the public sandbox, Cloudflare, and GitHub operate separately and may have their own privacy practices.</p>
    </section>

    <section>
      <h2>Information handled by this site</h2>
      <p>This site does not offer accounts, forms, advertising, or analytics. It does not intentionally collect personal information. Your browser may save a local light or dark theme preference.</p>
      <p>Like most hosted websites, the infrastructure serving this site may process basic request data such as your IP address, browser type, requested URL, and time of access for security, reliability, and delivery.</p>
    </section>

    <section>
      <h2>Links to other services</h2>
      <p>Links to GitHub, Cloudflare, and the Discoflare sandbox take you to services outside this site. Those services receive information under their own terms and privacy policies.</p>
    </section>

    <section>
      <h2>Your self-hosted workspace</h2>
      <p>Discoflare is self-hosted software. The person or organization that deploys a workspace controls its configuration and data. Questions about a particular workspace should go to that workspace operator.</p>
    </section>

    <section>
      <h2>Changes and contact</h2>
      <p>This policy may change as the site evolves. Material updates will appear here with a new effective date. For questions, contact the project maintainer through <a href="https://github.com/vnmtvlv" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
    </section>
  </LegalPage>
</template>
