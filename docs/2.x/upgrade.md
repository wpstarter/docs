# Upgrade from 1.x to 2.x

- [What needs to change](#what-needs-to-change)
- [Update PHP and Composer dependencies](#dependencies)
- [Replace the removed user class if still used](#user-class)
- [Keep WordPress routes loaded](#route-registration)
- [Move settings configuration](#settings-configuration)
- [Check application-specific compatibility](#application-compatibility)
- [Clear caches and verify](#verification)
- [Optionally migrate Mix to Vite](#optional-vite-migration)

## What needs to change {#what-needs-to-change}

WpStarter 1.x uses a Laravel 8.x foundation; 2.x uses Laravel 12. Start by upgrading `wpstarter/framework` and checking the PHP and dependency requirements. Framework 2.x has removed `WpStarter\Wordpress\User`; replace it with `WpStarter\Wordpress\Auth\User` only if your application still uses that old class. Most applications need no user class change, because the 1.x skeleton adopted `Auth\User` early in its development.

Custom framework extensions must match the new APIs, and optional packages must support WpStarter 2.x. Review the application-specific compatibility guidance below for the features your application uses.

The current 2.x skeleton uses `WpStarter\Wordpress\Application::configure()` in `bootstrap/app.php`, registers application providers in `bootstrap/providers.php`, and loads WordPress through the root `autoload.php`. Frontend middleware and exceptions are configured through `withMiddleware()` and `withExceptions()`; the admin module retains its own kernel. Existing applications can keep their explicit kernel bindings while upgrading the framework. If adopting the new skeleton layout, migrate custom middleware, exception handling, providers, console commands, and bootstrap code before removing the old files. Preserve application configuration, routes, and data.

**Vite is recommended, not required.** WpStarter 2.x still supports Laravel Mix, `ws_mix()`, and `public/mix-manifest.json`. You can upgrade the PHP framework first and migrate the asset build separately.

## Update PHP and Composer dependencies {#dependencies}

Use PHP 8.2 or later for both the WordPress web runtime and CLI. Check the extensions required by the framework and your application. Framework 2.x also requires Composer's runtime API `^2.2`.

Update your application's `composer.json` to allow the latest compatible 2.x framework release:

```json
{
  "require": {
    "php": "^8.2",
    "wpstarter/framework": "2.*"
  }
}
```

Merge these constraints into the existing file; retain the application's other dependencies, autoload mappings, and scripts. If your application still uses the removed user class, update it as shown below before running Composer, because post-update scripts may bootstrap the application.

```shell
composer update wpstarter/framework --with-all-dependencies
composer check-platform-reqs
composer show wpstarter/framework
```

If Composer reports a conflicting package, inspect its WpStarter/PHP constraints and select a compatible version. Review development tools and optional integrations as well as production dependencies. Commit the resulting lockfile and use `composer install` on deployment hosts.

## Replace the removed user class if still used {#user-class}

Framework 2.x has removed `WpStarter\Wordpress\User`. This affects only applications that still extend or reference that class. The 1.x skeleton has used `WpStarter\Wordpress\Auth\User` for years, so this change is rarely needed.

If your application still has:

```php
namespace App\Models;

class User extends \WpStarter\Wordpress\User
{
}
```

replace it with:

```php
namespace App\Models;

class User extends \WpStarter\Wordpress\Auth\User
{
}
```

Update imports and type hints that refer to the old class. Keep `config/auth.php` pointing to `App\Models\User` and retain the `wp` guard/provider when using WordPress login cookies. This changes the PHP base class; it does not require migrating WordPress accounts or replacing their passwords.

If your application already extends `WpStarter\Wordpress\Auth\User`, no change is needed here.

## Keep WordPress routes loaded {#route-registration}

The URL route cache covers the normal HTTP router, not the shortcode or admin routers. The current skeleton uses the WordPress application builder to load both URL routes and shortcode routes in `bootstrap/app.php`:

```php
use WpStarter\Wordpress\Application;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        wp: __DIR__.'/../routes/wp.php',
    )
    // Keep the application's withMiddleware() and withExceptions() configuration.
    ->create();
```

The `wp` argument accepts a path or an array of paths and applies the `web` middleware group. The WordPress routing provider loads these files when the application has booted, independently of the URL route cache. Use `WpStarter\Wordpress\Application` for this builder API and update the framework if the installed builder does not yet support `wp`.

When adopting `wp:`, remove the previous shortcode route loading from `AppServiceProvider::boot()` or `RouteServiceProvider` to avoid registering the routes twice. Preserve any custom route group attributes when moving them. Keep `AppServiceProvider` registered for its other responsibilities, such as shortcode components and translations. Do not move shortcode loading into `then` or the URL routing callback: those callbacks are skipped when URL routes are cached.

If retaining an older `RouteServiceProvider` instead of adopting the builder's `wp` argument, load shortcode routes outside `$this->routes(...)`:

```php
use WpStarter\Support\Facades\Route;
use WpStarter\Wordpress\Facades\Route as WpRoute;

// Inside App\Providers\RouteServiceProvider::boot():
$this->routes(function () {
    Route::middleware('api')->group(ws_base_path('routes/api.php'));
    Route::middleware('web')->group(ws_base_path('routes/web.php'));
});

WpRoute::middleware('web')->group(ws_base_path('routes/wp.php'));
```

Keep any application-specific namespace, prefix, and rate-limiter configuration. When moving API routes to `withRouting(api: ...)`, account for its default `/api` prefix; older skeletons declared `/api` in individual route paths. Remove that duplicate prefix from the declarations or set `apiPrefix: ''` to preserve the existing paths. Admin routes continue to load from the admin provider at runtime. See [cache and deployment](./configuration.md#configuration-caching).

If URL routes use `->hook(...)`, clear the URL route cache and leave it disabled: the compiled matcher bypasses the hook validator and can dispatch those controllers early. See [routing hook limitations](./routing.md#dispatch-at-a-wordpress-hook).

## Move settings configuration {#settings-configuration}

In 1.x, settings are configured in `App\Providers\SettingServiceProvider`. In 2.x, the framework automatically registers the settings provider and reads its configuration from the `settings` array in `config/wordpress.php`.

To migrate your 1.x settings configuration:

- Set `wordpress.settings.option_key` to the exact key returned by your existing provider's `getOptionKey()`. Preserving the key keeps the same stored settings.
- Move `$autoSave` and `$autoRestartQueue` values to `wordpress.settings.autosave` and `wordpress.settings.restart_queue`. The framework now reads these configuration keys instead of those provider properties.
- After migrating any additional custom behavior, remove the application settings provider and its registration from `bootstrap/providers.php` or `config/app.php`, wherever it was declared.

If your application needs a custom settings provider, keep it registered and extend `WpStarter\Wordpress\Setting\SettingServiceProvider`. The framework detects it and skips the default provider. Override `getOptionKey()`, `isAutosave()`, or `isRestartQueue()` as needed for custom behavior.

See [settings configuration](./integrations.md#settings) for the configuration array, defaults, and API. No stored WordPress options need to be migrated when `option_key` stays the same. Clear cached configuration with `php artisan config:clear` after the move, and rebuild it if your deployment uses a configuration cache.

## Check application-specific compatibility {#application-compatibility}

Use Laravel's upgrade guides for shared APIs across [9.x](https://laravel.com/docs/9.x/upgrade), [10.x](https://laravel.com/docs/10.x/upgrade), [11.x](https://laravel.com/docs/11.x/upgrade), and [12.x](https://laravel.com/docs/12.x/upgrade). Apply the relevant changes using `WpStarter` namespaces and `ws_*` helpers; the WpStarter package supplies the framework changes, while you remain responsible for application overrides and dependencies.

Pay particular attention to:

- Custom mail transports and callbacks using `Swift_*`: 2.x uses Symfony Mailer/Mime. The bundled WordPress `wp` transport is already adapted, so ordinary mail templates can continue using `MAIL_MAILER=wp_mail`.
- Custom filesystem adapters, logging integrations, and date calculations: framework 2.x uses Flysystem 3, Monolog 3, and Carbon 3.
- Methods that implement framework contracts or override framework classes: update signatures and return types where required.
- Optional packages such as Livewire: choose a version whose Composer requirements support WpStarter 2.x. A package targeting `Illuminate` APIs is not automatically compatible with the port.

## Clear caches and verify {#verification}

Back up the application and database, and verify the upgrade in a staging WordPress installation. Preserve the existing `APP_KEY`; this upgrade does not require generating a new key.

Clear generated caches with the upgraded application:

```shell
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan list
```

Rebuild deployment caches only after checking the target site's configuration and route registration. Verify URL routes, shortcode pages, admin GET/POST actions and middleware, WordPress login and user updates, database queries, mail, and any queue jobs or optional packages your application uses. Test both cached and uncached URL routes if you deploy a route cache.

No WpStarter-specific database migration is required just to rename the user base class. Run application migrations only when your own schema or an installed package requires them.

## Optionally migrate Mix to Vite {#optional-vite-migration}

You can keep the current Mix scripts, `webpack.mix.js`, Blade tags using `ws_mix()`, and `app.mix_url`. A framework upgrade does not require an npm dependency change.

For the recommended Vite setup, follow [Vite and migration from Mix](./assets.md). That guide covers ES modules, environment variables, WordPress asset URLs, and the distinction between Blade tags and WordPress enqueue handles.
