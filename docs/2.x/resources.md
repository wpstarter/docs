# Resource Manager

- [Queue and register resources](#queue-and-register)
- [Use existing WordPress handles](#existing-handles)
- [Configure resource groups](#resource-configuration)
- [Supply localization data](#localization-data)
- [Translate JavaScript](#javascript-translation)
- [Run browser callbacks at the footer](#browser-callbacks)

`ws_resources()` resolves `WpStarter\Wordpress\Dependency\ResourceManager`. It bridges application assets to WordPress script/style handles, dependency ordering, and frontend/admin output hooks. For a first enqueue example, see [frontend and admin assets](./integrations.md#assets). For Vite module tags, see [asset bundling](./assets.md).

## Queue and register resources {#queue-and-register}

| Method | Arguments after the handle |
| --- | --- |
| `addJs()` / `addAdminJs()` | `$src = false, $deps = [], $ver = false, $in_footer = true, $data = []` |
| `addCss()` / `addAdminCss()` | `$src = false, $deps = [], $ver = false, $media = 'all'` |
| `registerJs()` | `$src, $deps, $ver, $in_footer, $data` |
| `registerCss()` | `$src, $deps, $ver, $media` |

```php
ws_resources()
    ->registerJs('catalog-vendor', 'js/vendor.js', [], '1.0.0', true)
    ->addJs('catalog', 'js/catalog.js', ['catalog-vendor'], '1.0.0')
    ->addCss('catalog', 'css/catalog.css', [], '1.0.0');
```

Sources are resolved through `ws_asset()`, so relative paths use `app.asset_url`. Passing an existing absolute asset URL is also supported. Use `register*()` to make a handle available for dependencies without enqueueing it directly. Supply the footer argument explicitly when registering JavaScript, since omitted positional values are padded with null in the registration path.

Registered definitions flush at `init:10`; frontend queues flush at `wp_enqueue_scripts:100`, and admin queues at `admin_enqueue_scripts:100`. Adding a resource after its own queue has flushed calls WordPress immediately. It still needs to happen before the relevant output hook prints the resource. Register from a matched controller when assets should be limited to that page.

`addFile('css/catalog.css')` or `addFile('js/catalog.js')` detects the extension and uses the basename as the handle. Give resources explicit handles when files can share a basename. Dynamic `add*()`/`register*()` methods also accept an array containing the positional arguments.

## Use existing WordPress handles {#existing-handles}

```php
ws_resources()->addJs('jquery');
ws_resources()->addCss('dashicons');
ws_resources()->addAdminJs('jquery');
```

Omitting the source enqueues an already-registered handle. `addVendor('shared-ui')` enqueues both a script and a style with that handle; it accepts multiple handles or an array. `addAdminVendor('shared-ui')` does the same for a single admin handle. These methods do not install packages or discover files; the corresponding WordPress handles must already be registered.

## Configure resource groups {#resource-configuration}

Create `config/resources.php` for shared definitions. The manager reads groups of resource types; each entry is an array of positional arguments matching the methods above:

```php
<?php
return [
    'catalog' => [
        'registerjs' => [
            ['catalog-vendor', 'js/vendor.js', [], '1.0.0', true],
        ],
        'js' => [
            ['catalog', 'js/catalog.js', ['catalog-vendor'], '1.0.0', true],
        ],
        'css' => [
            ['catalog', 'css/catalog.css', [], '1.0.0', 'all'],
        ],
        'adminjs' => [
            ['catalog-admin', 'js/admin.js', ['jquery'], '1.0.0', true],
        ],
    ],
];
```

Supported types are `js`, `css`, `adminjs`, `admincss`, `registerjs`, and `registercss`; short aliases are `j`, `c`, `aj`/`ajs`, `ac`/`acss`, `rj`/`rjs`, and `rc`/`rcss`. Group names organize the file only: all groups are loaded when the manager boots, and frontend/admin entries are enqueued on all corresponding requests. Use controller queues for page-specific resources.

Use explicit versions as in the example. Empty versions fall back to the manager's default. The current `default_version` expression has a precedence issue, so do not rely on that configuration key alone for cache invalidation; check the installed implementation before using it.

## Supply localization data {#localization-data}

The final JavaScript argument maps object names to data passed to `wp_localize_script()`. A data value can be a closure evaluated when the script is registered or enqueued:

```php
ws_resources()->addJs('catalog', 'js/catalog.js', ['jquery'], '1.0.0', true, [
    'CatalogConfig' => function () {
        return ['endpoint' => ws_url('/api/catalog')];
    },
]);
```

Object names must be strings, and falsy data entries are skipped. The callback receives no injected arguments. This exposes configuration to the browser; include only values intended for client code.

## Translate JavaScript {#javascript-translation}

Register translation information before the script is registered/enqueued, especially when adding scripts after the queue has flushed:

```php
// Load the 'app' WordPress text domain before asset output.
ws_resources()
    ->setTranslation('catalog', 'app')
    ->addJs('catalog', 'js/catalog.js', ['wp-i18n'], '1.0.0');
```

With a domain and no path, the manager reads that domain's loaded WordPress translations, adds the `wp-i18n` dependency if needed, and attaches `wp.i18n.setLocaleData(...)` to the handle. Browser code can then use `wp.i18n.__('Save', 'app')`.

`translateUsing($domain, $path = '')` assigns translation information to the last resource added through the manager. Use it only while that resource is still queued; `setTranslation($handle, ...)` before adding the script is explicit and also works after queue flushing.

**Current path limitation:** `setTranslation()` and `translateUsing()` accept a translation path, but `setupTranslation()` reads it from the domain string instead of the stored translation record. The intended JSON-file branch is therefore not selected. For JSON translations, call native `wp_set_script_translations($handle, $domain, $path)` after the handle is registered and before it is printed, rather than relying on the manager's path argument.

## Run browser callbacks at the footer {#browser-callbacks}

The framework's `ScriptQueue` initializes `window.wpstarter` during frontend/admin script output. At footer priority 100 it runs queued functions, then replaces `push()` so later callbacks run immediately:

```html
<script>
window.wpstarter.push(function () {
    // Initialize this block after the footer's earlier script callbacks.
});
</script>
```

Use this after the header script hook has initialized the queue and with a layout that prints the matching footer hooks. It schedules synchronous callbacks around WordPress output; it does not wait for asynchronous or module scripts to finish loading.
