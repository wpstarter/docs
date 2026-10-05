import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import VersionSwitcher from './VersionSwitcher.vue'
import LegacyVersionWarning from './LegacyVersionWarning.vue'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'doc-before': () => h(LegacyVersionWarning)
  }),
  enhanceApp({ app }) {
    app.component('VersionSwitcher', VersionSwitcher)
  }
} satisfies Theme
