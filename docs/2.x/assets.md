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

Upgrade the PHP framework independently if that makes deployment easier. Use one asset-loading path for each entrypoint so the same application script is not loaded twice.

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

For PHP integration, resolve the WpStarter class:

```php
use WpStarter\Foundation\Vite;

$tags = ws_app(Vite::class)([
    'resources/css/app.css',
    'resources/js/app.js',
]);
```

Set `app.asset_url` to the plugin's public URL. The supplied configuration defaults to `ws_plugin_url('public')`, so the PHP side can generate plugin URLs. For the JavaScript build, set `ASSET_URL` to that same public URL in the build environment; for example:

```dotenv
APP_URL=https://example.com
ASSET_URL=https://example.com/wp-content/plugins/example-plugin/public
```

The Vite plugin reads this environment value to generate its production base path. PHP's fallback in `config/app.php` is not available to the Node build. Adjust the URL for your installation, including a WordPress subdirectory or WordPress-root application layout. Build with the target public URL so imported chunks, fonts, and images also resolve correctly. `MIX_URL` applies to Mix; it does not configure Vite.

## WordPress theme and admin integration {#wordpress-output}

In a full-page Blade layout, place `@vite(...)` in `<head>`. Keep `wp_head()` and `wp_footer()` when that layout also uses WordPress enqueue queues; see [full-page views](./views.md#full-page-views).

For content or shortcode responses that keep the theme, arrange for the directive's tags to be printed in the theme's head, or register a callback before `wp_head` runs. For an admin screen, use the relevant admin head hook. This frontend example emits the Vite tags once when WordPress prints the head:

```php
use WpStarter\Foundation\Vite;

// Register from a provider or matched controller before wp_head runs.
add_action('wp_head', function () {
    echo ws_app(Vite::class)([
        'resources/css/app.css',
        'resources/js/app.js',
    ]);
});
```

Limit registration to the pages that need the bundle. Theme head hooks must actually run. A content fragment should not repeat the entrypoint tags for every shortcode occurrence.

Vite tags and [WordPress resource queues](./integrations.md#assets) have different roles. Do not pass `$tags` above as the source to `ws_enqueue_js()`. It expects a URL, and its normal script tag is not automatically a Vite module script. Direct Vite tags do not register WordPress handles or dependency ordering; retain native enqueues for assets that rely on those features, or implement an adapter that handles module tags, development client, CSS, and imported chunks explicitly.

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
