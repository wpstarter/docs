<script setup lang="ts">
import { useData, withBase } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <div v-if="frontmatter.legacyVersion" class="legacy-warning custom-block warning" role="note">
    <p class="custom-block-title">WARNING</p>
    <p>
      You're browsing the documentation for an old version of WpStarter.
      Consider upgrading your project to
      <a :href="withBase('/2.x/')">WpStarter 2.x</a>.
    </p>
  </div>
</template>

<style scoped>
.legacy-warning {
  margin: 0 0 24px;
}
</style>
