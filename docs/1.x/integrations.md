# Settings, Assets, and Translation

- [Settings](#settings)
- [Frontend and admin assets](#assets)
- [Translation](#translation)

## Settings {#settings}

The skeleton's `App\Providers\SettingServiceProvider` uses the WordPress option key `ws_settings`. Change `getOptionKey()` for your application to avoid sharing settings with another plugin.

The repository supports dotted keys:

```php
$name = ws_setting('sample.name', 'Example');
ws_setting(['sample.name' => 'Updated']);
ws_setting()->set('sample.enabled', true);
ws_setting()->save();
```

`ws_setting($key, $default)` reads a value. Passing an array sets values in memory; calling with no arguments returns the repository. It also supports `get()`, `set()`, `has()`, and array access.

The provider automatically saves changes at WordPress `shutdown` by default. Call `save()` explicitly when persistence must happen before returning, as in the admin form example. Settings are stored together in one option; `save($autoload = false)` calls `update_option()`.

The provider also listens for changes to that option, reloads the repository, and calls `queue:restart` by default. Provider properties `$autoSave` and `$autoRestartQueue` control those behaviors. Queue workers retain their own in-memory state, so a restart is useful when settings change.

**Current limitation:** `forget()` removes an in-memory key without marking a change. A subsequent `save()` with no other changes does not persist that deletion. Do not rely on `forget()`, `unset()`, or array unsetting for persistent removal until this is corrected. Setting a nullable value is supported but keeps the key.

Use `ws_config()` for deployment configuration and `ws_setting()` for editable WordPress options. The repository is not a WordPress Settings API form registration system.

## Frontend and admin assets {#assets}

The resource manager queues dependencies for WordPress's native script/style functions:

```php
// Frontend controller or provider
ws_enqueue_css('catalog', ws_asset('css/catalog.css'), [], '1.0.0');
ws_enqueue_js(
    'catalog',
    ws_asset('js/catalog.js'),
    ['jquery'],
    '1.0.0',
    true,
    ['CatalogConfig' => ['endpoint' => ws_url('/api/catalog')]]
);
```

The last JavaScript argument maps object names to data passed through `wp_localize_script()`. Dependencies are WordPress handles; scripts default to footer output.

Use the admin queue for admin pages:

```php
ws_resources()->addAdminCss('sample-admin', ws_asset('css/admin.css'), [], '1.0.0');
ws_resources()->addAdminJs('sample-admin', ws_asset('js/admin.js'), ['jquery'], '1.0.0');
```

The manager registers queued definitions at `init`, then enqueues frontend assets on `wp_enqueue_scripts:100` and admin assets on `admin_enqueue_scripts:100`. Register definitions with `registerJs()` / `registerCss()` when a resource should be available by handle without being immediately enqueued. Attach assets in the page controller to limit them to a matched page.

The `ws_register_scripts` action receives the resource manager after registration. Assets added after their queue has flushed are passed to WordPress immediately, but still need to be added before the corresponding script/style output point.

WordPress hooks must actually print the resources. Theme-preserving responses use the theme's hooks. A full-page Blade layout must include `wp_head()` and `wp_footer()` or manage its own asset tags; see [full-page views](./views.md#full-page-views).

Use explicit version arguments for predictable cache invalidation. The manager resolves sources through `ws_asset()`; generated URLs depend on `app.asset_url`.

## Translation {#translation}

The skeleton loads a WordPress text domain in `AppServiceProvider::boot()`:

```php
use WpStarter\Wordpress\Facades\L10n;

L10n::loadDomain('app', ws_resource_path('lang'));
```

The loader first checks `WP_LANG_DIR/plugins/app-{locale}.mo`, then `resources/lang/{locale}.mo`. Its locale comes from the application configuration, normally WordPress's `determine_locale()`.

Use WordPress's functions with a domain, or the facade's default domain:

```php
$text = __('Save', 'app');
$text = L10n::__('Save');
$text = L10n::_x('Post', 'noun');
$text = L10n::_n('One item', '%s items', $count);
```

The first loaded domain becomes the facade's default unless you set another with `L10n::setDefaultDomain()`. Escape translated text according to where it is rendered.

Laravel-style translation files and `ws_trans()` remain separate from WordPress `.mo` files. Use the Laravel documentation for that translation API; use the WordPress domain integration when sharing translations with WordPress code.
