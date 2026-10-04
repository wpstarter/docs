<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRouter, withBase } from 'vitepress'
import { versionLink } from '../version-links.mjs'

interface Version {
  id: string
  label: string
  pages: string[]
}

const props = defineProps<{ versions: Version[]; screenMenu?: boolean }>()
const { page } = useData()
const router = useRouter()
const selected = computed(() =>
  props.versions.find(version => page.value.relativePath.startsWith(version.id + '/'))?.id || ''
)

function changeVersion(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  const target = props.versions.find(version => version.id === id)
  if (!target) return

  router.go(withBase(versionLink(
    page.value.relativePath,
    target,
    window.location.search,
    window.location.hash
  )))
}
</script>

<template>
  <div class="version-switcher" :class="{ 'screen-menu': screenMenu }">
    <label>
      <span class="label">Version</span>
      <select :value="selected" aria-label="Documentation version" @change="changeVersion">
        <option value="" disabled>Choose version</option>
        <option v-for="version in versions" :key="version.id" :value="version.id">
          {{ version.label }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.version-switcher {
  display: flex;
  align-items: center;
  min-height: var(--vp-nav-height);
  padding: 0 12px;
}
label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}
.label {
  color: var(--vp-c-text-2);
}
select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 5px 8px;
  font: inherit;
  cursor: pointer;
}
select:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.screen-menu {
  min-height: 0;
  padding: 12px 0;
  border-top: 1px solid var(--vp-c-divider);
}
</style>
