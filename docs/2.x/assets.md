# Vite and Migration from Mix

- [Choose an asset build](#choose-an-asset-build)
- [Install and configure Vite](#vite-configuration)
- [Convert JavaScript and environment variables](#javascript)
- [Load assets in Blade](#blade)
- [WordPress theme and admin integration](#wordpress-output)
- [Development and production](#build-and-deploy)
- [Keep using Mix](#mix)

## Choose an asset build {#choose-an-asset-build}

Vite is the recommended build tool for WpStarter 2.x and is configured in the 2.x skeleton. Migrating to it is optional: `WpStarter\Foundation\Mix` and `ws_mix()` remain available, including manifest versioning and Mix hot-file handling.

Use one asset-loading path for each entrypoint so the same application script is not loaded twice.

For general Vite features, consult [Laravel 12.x asset bundling](https://laravel.com/docs/12.x/vite). Here, Blade resolves `WpStarter\Foundation\Vite`, and asset URLs must point to the plugin's public directory inside WordPress.

## Install and configure Vite {#vite-configuration}

The 2.x skeleton uses Vite 7 and `laravel-vite-plugin` 2. Those packages require Node.js `^20.19.0 || >=22.12.0`; use a supported Node.js release for your build environment. If you select different package majors, check their engine requirements.

For an existing Mix application:

```shell
npm install --save-dev vite@^7.0.7 laravel-vite-plugin@^2.0.0
```

Replace the Mix commands in `package.json` with:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

Retain dependencies used by your application. Setting `type` to `module` also affects Node configuration files: convert remaining CommonJS configuration to ESM or rename it to `.cjs`. Once the migration is verified, remove unused Mix dependencies and configuration. If keeping Mix temporarily alongside Vite, give their commands different names and rename a CommonJS `webpack.mix.js` to `.cjs`, updating its command accordingly.

Create `vite.config.js` in the application root:

```js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
```

List source entrypoints, not the former Mix output paths such as `public/js/app.js`. Adapt CSS processors, Sass, aliases, static file copying, and other custom webpack tasks to Vite plugins as needed.

## Convert JavaScript and environment variables {#javascript}

Vite application source uses ES module imports. When migrating an existing application, replace any older `require()` bootstrap before using its Vite entrypoint:

```js
// resources/js/app.js
import './bootstrap';
```

```js
// resources/js/bootstrap.js
import axios from 'axios';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
```

Install `axios` if your project uses this example. If you still need Lodash, retain/install that dependency and import it explicitly; otherwise remove `window._ = require('lodash')`. Convert other application-level `require()` calls and webpack-specific imports as well.

Replace browser environment access, for example:

```js
// Mix:
const key = process.env.MIX_PUSHER_APP_KEY;
```

```js
// Vite:
const key = import.meta.env.VITE_PUSHER_APP_KEY;
```

Rename the corresponding `.env` keys and rebuild. Values exposed through `VITE_*` are public browser configuration; keep server secrets outside them.

## Load assets in Blade {#blade}

Replace tags that reference Mix's output files:

```blade
<link rel="stylesheet" href="{{ ws_mix('css/app.css') }}">
<script src="{{ ws_mix('js/app.js') }}" defer></script>
```

with the source entrypoints configured in Vite:

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

The directive emits stylesheet, module script, and preload tags. During development it reads `public/hot`; for a production build it reads `public/build/manifest.json`. It returns HTML tags, not a single script URL.

To obtain an asset URL in PHP, use the Vite facade:

```php
use WpStarter\Support\Facades\Vite;

$scriptUrl = Vite::asset('resources/js/app.js');
$styleUrl = Vite::asset('resources/css/app.css');
```

`asset()` returns a URL suitable for the Resource Manager or WordPress enqueue functions. The facade resolves the same `WpStarter\Foundation\Vite` singleton used by `@vite`. For an instance, use `ws_app(\WpStarter\Foundation\Vite::class)` or inject that class into a constructor. The framework does not register a `vite` container alias, so use the facade or class binding rather than `ws_app('vite')`.

Set `app.asset_url` to the plugin's public URL. The supplied configuration defaults to `ws_plugin_url('public')`, so the PHP side can generate plugin URLs. For the JavaScript build, set `ASSET_URL` to that same public URL in the build environment; for example:

```dotenv
APP_URL=https://example.com
ASSET_URL=https://example.com/wp-content/plugins/example-plugin/public
```

The Vite plugin reads this environment value to generate its production base path. PHP's fallback in `config/app.php` is not available to the Node build. Adjust the URL for your installation, including a WordPress subdirectory or WordPress-root application layout. Build with the target public URL so imported chunks, fonts, and images also resolve correctly. `MIX_URL` applies to Mix; it does not configure Vite.

## WordPress theme and admin integration {#wordpress-output}

In a full-page Blade layout, place `@vite(...)` in `<head>`. Keep `wp_head()` and `wp_footer()` when that layout also uses WordPress enqueue queues; see [full-page views](./views.md#full-page-views).

For theme-rendered content, shortcode pages, and admin screens, resolve URLs with `Vite::asset()` and enqueue them through the [Resource Manager](./resources.md). WordPress then owns the handles, dependencies, and output timing. Keep `@vite` for Blade layouts that own their asset output; use one loading method per bundle on a page.

### Enqueue through the Resource Manager

The following example uses the skeleton's separate CSS and JavaScript entrypoints. Register these callbacks once in `AppServiceProvider::boot()`. The tag filter requires WordPress 6.2 or later:

```php
use WpStarter\Support\Facades\Vite;

add_filter('script_loader_tag', function ($tag, $handle) {
    if (!in_array($handle, ['catalog-vite-client', 'catalog-vite-app'], true)) {
        return $tag;
    }

    $html = new \WP_HTML_Tag_Processor($tag);
    if ($html->next_tag('script')) {
        $html->set_attribute('type', 'module');
        $html->set_attribute('crossorigin', 'anonymous');
    }

    return $html->get_updated_html();
}, 10, 2);

add_action('wp_enqueue_scripts', function () {
    if (!is_page('catalog')) {
        return;
    }

    $resources = ws_resources();
    $version = Vite::manifestHash() ?: WS_VERSION;
    $dependencies = [];

    if (Vite::isRunningHot()) {
        $resources->addJs('catalog-vite-client', Vite::asset('@vite/client'), [], $version);
        $dependencies[] = 'catalog-vite-client';
    }

    $resources->addCss('catalog-vite-style', Vite::asset('resources/css/app.css'), [], $version);
    $resources->addJs('catalog-vite-app', Vite::asset('resources/js/app.js'), $dependencies, $version);
});
```

Change the page condition and use handles unique to your plugin. The Resource Manager flushes its frontend queue at `wp_enqueue_scripts:100`, after this callback. You can also queue the same resources directly from a matched controller before asset output. The theme must run its usual `wp_head()` and `wp_footer()` hooks.

The scoped [`script_loader_tag` filter](https://developer.wordpress.org/reference/hooks/script_loader_tag/) makes only these Vite scripts modules and preserves their other attributes. Resource Manager JavaScript handles use WordPress's classic script queue, so setting module attributes is necessary. WordPress handle dependencies order the tags; ES module dependencies belong in JavaScript `import` statements.

For admin pages, use [`admin_enqueue_scripts`](https://developer.wordpress.org/reference/hooks/admin_enqueue_scripts/), check its `$hookSuffix` argument against your screen, and use `addAdminCss()` / `addAdminJs()` in place of `addCss()` / `addJs()`. Enqueue the development client through `addAdminJs()` too; keep the same module-tag filter for its handles. Register these callbacks from a provider, before WordPress runs the enqueue hooks.

### Use WordPress enqueue functions directly

With the same Vite facade import at the top of the file, the equivalent native calls inside a [`wp_enqueue_scripts`](https://developer.wordpress.org/reference/hooks/wp_enqueue_scripts/) callback are:

```php
$dependencies = [];

if (Vite::isRunningHot()) {
    wp_enqueue_script('catalog-vite-client', Vite::asset('@vite/client'), [], null, true);
    $dependencies[] = 'catalog-vite-client';
}

wp_enqueue_style('catalog-vite-style', Vite::asset('resources/css/app.css'), [], null);
wp_enqueue_script('catalog-vite-app', Vite::asset('resources/js/app.js'), $dependencies, null, true);
```

Keep the module-tag filter from the Resource Manager example. Use either this native enqueue example or the Resource Manager example for a bundle.

### CSS imported from JavaScript

`asset()` resolves one file; it does not enqueue the CSS or preload tags generated by `@vite`. The examples above load CSS from the separate `resources/css/app.css` entrypoint. If JavaScript also imports CSS, production builds extract those styles into the manifest's `css` lists. Enqueue those files as well, including CSS from recursively imported chunks. If you move `app.css` into JavaScript imports, remove its separate Vite input and `addCss()` call to avoid loading it twice. For example, add this inside the Resource Manager callback after resolving `$resources` and `$version`:

```php
if (!Vite::isRunningHot()) {
    $manifest = json_decode(
        file_get_contents(ws_public_path('build/manifest.json')),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );
    $seen = [];
    $styles = [];
    $collect = function ($entry) use (&$collect, &$seen, &$styles, $manifest) {
        if (isset($seen[$entry])) {
            return;
        }
        $seen[$entry] = true;

        foreach ($manifest[$entry]['css'] ?? [] as $file) {
            $styles[$file] = true;
        }
        foreach ($manifest[$entry]['imports'] ?? [] as $import) {
            $collect($import);
        }
    };
    $collect('resources/js/app.js');

    foreach (array_keys($styles) as $file) {
        $resources->addCss('catalog-vite-'.md5($file), ws_asset('build/'.$file), [], $version);
    }
}
```

Use `addAdminCss()` for the admin queue. Match the manifest path and asset prefix to your build directory if customized. Static JavaScript imports load through the browser's module graph; Vite handles dynamic-import chunks and their CSS at runtime. Module preloads are optional performance hints. See [Vite's backend integration guide](https://vite.dev/guide/backend-integration.html) for manifest traversal. A URL-based enqueue does not apply custom tag attributes or integrity metadata configured on the Vite tag renderer; configure those through WordPress filters when needed.

## Development and production {#build-and-deploy}

Run the development server from the application directory:

```shell
npm run dev
```

Visit the WordPress page, rather than the Vite server as an application. Set `APP_URL` to the actual WordPress origin so the development integration can allow that origin. For HTTPS sites, configure matching development-server TLS and HMR settings as described in the upstream Vite guide.

Build production assets with:

```shell
npm run build
```

Deploy the entire `public/build` directory, including the manifest and all imported chunks/assets. Do not deploy a development `public/hot` file: its presence makes the PHP integration use the development server instead of the production manifest. Vite's `public/hot` and Mix's default hot file share the same path, so stop the old development server and remove its stale hot file when switching tools.

Verify a production page with the development server stopped: CSS, JavaScript modules, dynamic imports, and images should load from the intended plugin URL. Keep build configuration and the npm lockfile with the application.

## Keep using Mix {#mix}

No asset migration is necessary for an existing working Mix setup. Keep `webpack.mix.js`, its npm scripts/dependencies, and the generated `public/mix-manifest.json` and output files. Continue using:

```blade
<link rel="stylesheet" href="{{ ws_mix('css/app.css') }}">
<script src="{{ ws_mix('js/app.js') }}" defer></script>
```

`app.mix_url` controls the public prefix for production manifest URLs; the skeleton defaults it to `ws_plugin_url('public')`. Preserve your existing versioning and deployment steps. Both Mix and Vite can be used with framework 2.x; choose when to migrate based on the application's frontend build requirements.
