# WordPress Configuration

- [Application configuration](#introduction)
- [Environment and wp-config.php](#environment-configuration)
- [Database, authentication, and mail](#wordpress-services)
- [URLs, assets, locale, and time](#urls-assets-locale-and-time)
- [Cache and deployment](#configuration-caching)
- [Debugging and maintenance](#debug-mode)

## Application configuration {#introduction}

WpStarter uses `config/*.php`, `.env`, and the Laravel-style configuration API. Read [Laravel 12.x configuration](https://laravel.com/docs/12.x/configuration) for environment types, configuration lookup, and caching. In WpStarter, use `ws_env()`, `ws_config()`, and `WpStarter\Support\Facades\Config`.

This chapter describes values that interact with the surrounding WordPress application. The supplied config files are the source of truth for your installed skeleton.

## Environment and wp-config.php {#environment-configuration}

The project has its own `.env` in addition to WordPress's `wp-config.php`. Keep `.env` private and use `ws_env()` only from configuration files when you cache configuration.

WpStarter does not automatically convert arbitrary WordPress constants into configuration. To use a constant, read it explicitly from your config file:

```php
// An entry in your configuration array:
return [
    'name' => defined('MY_PLUGIN_NAME')
        ? MY_PLUGIN_NAME
        : ws_env('APP_NAME', 'WpStarter'),
    // Other configuration entries...
];
```

WordPress loads before WpStarter, so constants defined in `wp-config.php` are available. Some skeleton configs already do this for database credentials.

Use `ws_config('app.name')` in application code. Persistent user-editable plugin settings belong in WordPress options through `ws_setting()`; see [settings](./integrations.md#settings).

## Database, authentication, and mail {#wordpress-services}

| Service | Supplied configuration | WordPress behavior |
| --- | --- | --- |
| Database | `DB_CONNECTION=wpdb`; connection driver `wp` | Uses the WordPress database adapter and `$wpdb`; credentials come from `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` constants |
| Table names | `database.connections.wpdb.prefix` from `$wpdb->prefix` | Application table names use the configured WordPress prefix |
| Authentication | Guard `web`, driver `wp`, provider `wp`, model `App\Models\User` | Reads the current WordPress user and uses WordPress authentication cookies |
| Mail | `MAIL_MAILER=wp_mail`, transport `wp` | Delivers through WordPress `wp_mail()` |
| Sessions | `SESSION_DRIVER=file` in the example environment | Framework sessions for CSRF, validation errors, old input, and notices; distinct from WordPress login cookies |

The example environment still contains generic `DB_*` values; they do not override WordPress constants used by the supplied `wpdb` connection. Switching to another configured connection changes which adapter and values are used.

Use `current_user_can()` for WordPress capabilities. A logged-in guard check does not imply permission to manage a particular resource. See [admin authorization](./admin.md#middleware-and-capabilities).

For mail templates and the normal database/query APIs, refer to the corresponding Laravel 12.x documentation and adapt namespaces/helpers. These docs do not repeat those APIs.

## URLs, assets, locale, and time {#urls-assets-locale-and-time}

Review these values in `config/app.php`:

| Key | Skeleton behavior |
| --- | --- |
| `app.url` | `APP_URL`, otherwise `site_url()`; the example environment sets `http://localhost`, so change it for your site |
| `app.asset_url` | `ASSET_URL`, otherwise `ws_plugin_url('public')` |
| `app.mix_url` | `MIX_URL`, otherwise `ws_plugin_url('public')` |
| `app.timezone` | Fixed to `UTC`; the skeleton explicitly keeps PHP's timezone compatible with WordPress |
| `app.locale` | `determine_locale()` when available, otherwise `en` |
| `app.fallback_locale` | `en` |
| `app.debug_external` | `APP_DEBUG_EXTERNAL`, default false |

Use `ws_asset()` for files under the configured public asset URL. `ws_plugin_url()` derives the project path from `__WS_FILE__` and `ABSPATH`, then uses `network_site_url()`; verify generated URLs if your application directory is outside WordPress or your deployment has unusual multisite paths.

The Laravel translation service and WordPress text domains serve different purposes. See [translation integration](./integrations.md#translation).

## Cache and deployment {#configuration-caching}

Generate configuration caches in the environment where WordPress will run:

```shell
php artisan config:cache
```

WordPress-derived values such as table prefixes, URLs, and locale can become fixed in the cache. Do not copy a cache built against a different site's database or URL. Use `php artisan config:clear` when those values change.

`route:cache` caches frontend URL routes only. The supplied 2.x provider loads `routes/wp.php` outside the URL route callback, so shortcode routes are registered even when URL routes are cached. Admin routes are registered separately by their own provider. Shortcode and admin routes remain runtime collections; their WordPress matching is not part of the compiled URL cache.

If an older application still loads `routes/wp.php` inside `$this->routes(...)`, move it outside that callback before enabling URL route caching; see [upgrading route registration](./upgrade.md#route-registration). Build the cache in the target WordPress environment and verify URL, shortcode, and admin pages afterwards.

Ensure session/cache directories remain writable. For a WordPress-root installation served by Nginx, adapt the provided access rules as described in [installation](./installation.md#initial-configuration).

## Debugging and maintenance {#debug-mode}

`APP_DEBUG` controls application error output. `APP_DEBUG_EXTERNAL` separately controls handling of errors outside the application. The skeleton also supplies `LOG_EXTERNAL_CHANNEL=stack_wp`. These are WpStarter configuration values, separate from WordPress's `WP_DEBUG` constants.

Keep both application debug flags false in production. See the WordPress exception bootstrap and `config/logging.php` when choosing how external errors should be logged.

The supplied HTTP and admin kernels include maintenance middleware, and `WordpressStarter::initWeb()` checks for a pre-rendered maintenance file. Maintenance can therefore affect the surrounding WordPress request, including admin access. Evaluate it on your site before using `php artisan down` during deployment. Use Laravel's documentation for the general maintenance command options.
