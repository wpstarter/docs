# WpStarter Documentation Website

A single VitePress site with a shared homepage and separate documentation directories for each framework version.

## Develop and build

Use Node.js 24 (or another version supported by the installed VitePress/Vite packages).

```shell
npm ci
npm run dev
npm run docs:build
npm run preview
```

`docs:build` builds the site and checks all generated internal document links and fragments. Dead links remain build errors. `docs:check` repeats the output check without rebuilding.

The output is `docs/.vitepress/dist`. The homepage is `/`, the preferred documentation is `/2.x/`, and `/1.x/` remains available. Source pages such as `docs/2.x/routing.md` become `/2.x/routing`.

## Documentation versions

`docs/.vitepress/versions.mjs` is the version registry. It drives the documentation navigation switcher and legacy-page warnings. Keep the preferred version first. The shared homepage has a Getting Started action and no version selector.

To add a version:

1. Create `docs/<version>/` and supply its real content, including `index.md` and `documentation.md`.
2. Add the version ID, label, and summary to the registry.
3. Edit that version's `documentation.md` to define its sidebar groups and links.
4. Update the homepage's primary action if the preferred version changes.
5. Run `npm run docs:build`.

Use relative Markdown links inside a version, such as `./routing.md#wordpress-routes`. They stay within that version when copied. Use explicit heading IDs such as `## URL routes {#basic-routing}` when retaining an existing fragment.

The version switcher opens the same article in the target version if it exists, preserving the query string and fragment. Otherwise it opens that version's overview and drops the article fragment. Every page in an older version displays a warning suggesting a project upgrade.

Local search on the homepage searches only the preferred (latest) documentation version. Within documentation, search results stay in the version currently being viewed, including after switching versions.

## Why native VitePress routing?

The requested layout is a shared product homepage plus explicit URLs for every documentation version. VitePress's file-based routing and multiple sidebars fit this directly.

`@viteplus/versions@2.2.0` was inspected. It supports the installed VitePress version, but defaults to current docs from `src/` at the root and archived docs from `archive/<version>/`. Its current-version switch target is the root. That convention would mix the shared homepage with the current documentation entry. Custom rewrites can adapt it, but would add configuration without simplifying this layout.

This site therefore uses native routing, per-version sidebars, and a small version selector. The unused versioning dependency has been removed. Reconsider an archive plugin if the project later needs automated snapshots, locale/version combinations, or separate archived configuration.

References: [VitePress routing](https://vitepress.dev/guide/routing), [multiple sidebars](https://vitepress.dev/reference/default-theme-sidebar#multiple-sidebars), [versioning plugin](https://github.com/viteplus/versions).

## Hosting

For a root deployment, leave `DOCS_BASE` unset. For a project/subdirectory deployment, set it to the site's URL prefix before building:

```shell
DOCS_BASE=/docs/ npm run docs:build
```

PowerShell:

```powershell
$env:DOCS_BASE = '/docs/'
npm run docs:build
```

Navigation, assets, and version switching use VitePress's base path. The GitHub Pages workflow reads that prefix from `configure-pages` and builds with it.

Clean URLs require the static host to resolve `/1.x/routing` to `/1.x/routing.html`. VitePress preview and GitHub Pages support this layout; configure equivalent routing on another host.

Maintainer notes are under `maintainers/`, outside the published Markdown source. `references/` contains the reviewed plugin and is ignored by Git. Generated VitePress output and caches are also ignored.
