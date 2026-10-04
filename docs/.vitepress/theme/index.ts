import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import VersionSwitcher from './VersionSwitcher.vue'
import DocumentationVersions from './DocumentationVersions.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VersionSwitcher', VersionSwitcher)
    app.component('DocumentationVersions', DocumentationVersions)
  }
} satisfies Theme
