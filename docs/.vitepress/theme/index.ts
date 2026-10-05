import DefaultTheme from 'vitepress/theme'
import { dataSymbol, useData, withBase, type Theme } from 'vitepress'
import { computed, h, provide } from 'vue'
import { versions } from '../versions.mjs'
import VersionSwitcher from './VersionSwitcher.vue'
import LegacyVersionWarning from './LegacyVersionWarning.vue'

export default {
  extends: DefaultTheme,
  Layout: {
    setup() {
      const data = useData()
      const theme = computed(() => {
        const version = versions.find(version =>
          data.page.value.relativePath.startsWith(version.id + '/')
        ) || versions[0]
        const prefix = withBase('/' + version.id + '/')
        const search = data.theme.value.search

        if (search?.provider !== 'local') return data.theme.value

        return {
          ...data.theme.value,
          search: {
            ...search,
            options: {
              ...search.options,
              miniSearch: {
                ...search.options?.miniSearch,
                searchOptions: {
                  ...search.options?.miniSearch?.searchOptions,
                  filter: (result: { id: string }) => result.id.startsWith(prefix)
                }
              }
            }
          }
        }
      })

      provide(dataSymbol, { ...data, theme })

      return () => h(DefaultTheme.Layout, null, {
        'doc-before': () => h(LegacyVersionWarning)
      })
    }
  },
  enhanceApp({ app }) {
    app.component('VersionSwitcher', VersionSwitcher)
  }
} satisfies Theme
