import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'
import { documentationNavigation } from './navigation.mjs'

const { sidebar, publishedVersions } = documentationNavigation(
  fileURLToPath(new URL('../', import.meta.url))
)
const preferred = publishedVersions[0]
const base = '/' + (process.env.DOCS_BASE || '').split('/').filter(Boolean).join('/') + '/'

export default defineConfig({
  title: 'WpStarter',
  description: 'Build WordPress applications with WpStarter.',
  lang: 'en-US',
  base: base === '//' ? '/' : base,
  cleanUrls: true,
  srcExclude: ['**/_parts/**', '**/_*.md'],
  themeConfig: {
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    nav: [
      { text: 'Home', link: '/', activeMatch: '^/$' },
      { text: 'Documentation', link: '/' + preferred.id + '/', activeMatch: '^/[^/]+/' },
      { component: 'VersionSwitcher', props: { versions: publishedVersions } }
    ],
    sidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/wpstarter/framework' }],
    footer: {
      message: 'WordPress integration, with Laravel-style application APIs.'
    }
  },
  transformPageData(page) {
    const version = publishedVersions.find(version => page.relativePath.startsWith(version.id + '/'))
    if (version && version.id !== preferred.id) {
      page.frontmatter.legacyVersion = version.label
    }
  }
})
