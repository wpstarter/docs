import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { versions } from './versions.mjs'

export function documentationNavigation(root) {
  const sidebar = {}
  const publishedVersions = versions.map(version => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(version.id)) {
      throw new Error('Invalid documentation version: ' + version.id)
    }

    const directory = join(root, version.id)
    const pages = readdirSync(directory).filter(name => name.endsWith('.md'))
    if (!pages.includes('index.md') || !pages.includes('documentation.md')) {
      throw new Error(version.id + ' requires index.md and documentation.md')
    }

    const groups = [{ text: version.label + ' Documentation', link: '/' + version.id + '/' }]
    let group
    for (const line of readFileSync(join(directory, 'documentation.md'), 'utf8').split(/\r?\n/)) {
      const heading = line.match(/^## (.+)$/)
      if (heading) {
        group = { text: heading[1], items: [] }
        groups.push(group)
        continue
      }

      const item = line.match(/^- \[([^\]]+)\]\(\.\/([a-z0-9-]+)\.md\)$/)
      if (!item) continue
      if (!group || !existsSync(join(directory, item[2] + '.md'))) {
        throw new Error('Invalid sidebar target in ' + version.id + ': ' + line)
      }
      group.items.push({ text: item[1], link: '/' + version.id + '/' + item[2] })
    }

    if (groups.length === 1 || groups.slice(1).some(group => group.items.length === 0)) {
      throw new Error('Missing navigation entries for ' + version.id)
    }

    sidebar['/' + version.id + '/'] = groups
    return { ...version, pages }
  })

  return { sidebar, publishedVersions }
}
