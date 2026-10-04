import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)), 'docs/.vitepress/dist')
if (!existsSync(join(root, 'index.html'))) {
  throw new Error('Build the site first: npm run docs:build')
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = join(directory, entry.name)
    return entry.isDirectory() ? htmlFiles(target) : entry.name.endsWith('.html') ? [target] : []
  })
}

const index = readFileSync(join(root, 'index.html'), 'utf8')
const base = (index.match(/href="([^"]*)\/assets\/[^"]+\.css"/)?.[1] || '') + '/'
const origin = 'https://docs.local'
const errors = []
let links = 0
const html = new Map()
const ids = new Map()

for (const file of htmlFiles(root)) {
  const content = readFileSync(file, 'utf8')
  html.set(file, content)
  ids.set(file, new Set([...content.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])))
}

function pageFile(pathname) {
  const local = decodeURIComponent(pathname.slice(base.length)).replace(/^\/+/, '')
  const exact = resolve(root, local || 'index.html')
  if (exact !== root && !exact.startsWith(root + '/')
      && !exact.startsWith(root + '\\')) return undefined
  return [exact, exact + '.html', join(exact, 'index.html')].find(file => html.has(file))
}

for (const [file, content] of html) {
  const source = relative(root, file).replaceAll('\\', '/')
  const current = new URL(base + source, origin)
  if (content.includes('{{version}}')) errors.push(source + ': unresolved version placeholder')
  if (content.includes('TinyInstaller')) errors.push(source + ': stale template branding')

  for (const match of content.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&')
    const target = new URL(href, current)
    if (target.origin !== origin || !['http:', 'https:'].includes(target.protocol)) continue
    if (!target.pathname.startsWith(base)) {
      errors.push(source + ': link leaves configured base: ' + href)
      continue
    }
    if (/\.[a-z0-9]+$/i.test(target.pathname) && !target.pathname.endsWith('.html')) continue

    links++
    const destination = pageFile(target.pathname)
    if (!destination) {
      errors.push(source + ': missing document: ' + href)
    } else if (target.hash && !ids.get(destination).has(decodeURIComponent(target.hash.slice(1)))) {
      errors.push(source + ': missing fragment: ' + href)
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log('Checked ' + html.size + ' built pages and ' + links + ' internal links/fragments (base ' + base + ').')
}
