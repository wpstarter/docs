<script setup lang="ts">
import { withBase } from 'vitepress'
import { versions } from '../versions.mjs'
</script>

<template>
  <section class="documentation-versions" aria-labelledby="documentation-versions-heading">
    <h2 id="documentation-versions-heading">Choose a documentation version</h2>
    <p>Each version has its own guides and navigation.</p>
    <div class="version-list">
      <a v-for="version in versions" :key="version.id"
         :href="withBase('/' + version.id + '/')" class="version-card">
        <strong>WpStarter {{ version.label }}</strong>
        <span>{{ version.summary }}</span>
        <span class="read-docs">Read documentation →</span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.documentation-versions {
  max-width: 1152px;
  margin: 48px auto 0;
  padding: 0 24px 64px;
}
h2 {
  margin-bottom: 8px;
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
}
p {
  color: var(--vp-c-text-2);
}
.version-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 24px;
}
.version-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 24px;
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.version-card:hover, .version-card:focus-visible {
  border-color: var(--vp-c-brand-1);
}
.version-card span {
  color: var(--vp-c-text-2);
}
.version-card .read-docs {
  color: var(--vp-c-brand-1);
  font-weight: 500;
}
@media (min-width: 640px) {
  .documentation-versions { padding-inline: 48px; }
}
@media (min-width: 960px) {
  .documentation-versions { padding-inline: 64px; }
}
</style>
