/**
 * sourcePage is VitePress's source-relative path, e.g. 1.x/routing.md.
 * A missing article falls back to the target version's overview.
 */
export function versionLink(sourcePage, target, search = '', hash = '') {
  const segments = sourcePage.split('/')
  const article = segments.length > 1 ? segments.slice(1).join('/') : 'index.md'
  const hasArticle = segments.length > 1 && target.pages.includes(article)
  const page = hasArticle ? article : 'index.md'
  const path = page === 'index.md'
    ? '/' + target.id + '/'
    : '/' + target.id + '/' + page.replace(/\.md$/, '')

  return path + search + (hasArticle ? hash : '')
}
