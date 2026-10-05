# Upgrade from 1.x to 2.x

- [What needs to change](#what-needs-to-change)
- [Update PHP and Composer dependencies](#dependencies)
- [Replace the removed user class if still used](#user-class)
- [Keep WordPress routes loaded](#route-registration)
- [Check application-specific compatibility](#application-compatibility)
- [Clear caches and verify](#verification)
- [Optionally migrate Mix to Vite](#optional-vite-migration)

## What needs to change {#what-needs-to-change}

WpStarter 1.x uses a Laravel 8.x foundation; 2.x uses Laravel 12. Start by upgrading `wpstarter/framework` and checking the PHP and dependency requirements. Framework 2.x has removed `WpStarter\Wordpress\User`; replace it with `WpStarter\Wordpress\Auth\User` only if your application still uses that old class. Most applications need no user class change, because the 1.x skeleton adopted `Auth\User` early in its development.

Custom framework extensions must match the new APIs, and optional packages must support WpStarter 2.x. Review the application-specific compatibility guidance below for the features your application uses.

The inspected 2.x skeleton retains the WordPress entrypoint, explicit kernel bindings in `bootstrap/app.php`, application providers, and separate frontend/admin kernels. You do not need to adopt a standalone Laravel application's new bootstrap structure to upgrade this skeleton. Keep the existing application configuration, routes, and data.

**Vite is recommended, not required.** WpStarter 2.x still supports Laravel Mix, `ws_mix()`, and `public/mix-manifest.json`. You can upgrade the PHP framework first and migrate the asset build separately.

## Update PHP and Composer dependencies {#dependencies}

Use PHP 8.2 or later for both the WordPress web runtime and CLI. Check the extensions required by the framework and your application. Framework 2.x also requires Composer's runtime API `^2.2`.

Update your application's `composer.json`. The inspected 2.x skeleton uses:

```json
{
  "require": {
    "php": "^8.2",
    "wpstarter/framework": "^2.1"
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

The URL route cache covers the normal HTTP router, not the shortcode or admin routers. If your old `RouteServiceProvider` loads `routes/wp.php` inside `$this->routes(...)`, move that registration outside the callback:

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

Keep any application-specific namespace, prefix, and rate-limiter configuration. The supplied 1.x and 2.x references already use this arrangement. Admin routes continue to load from the admin provider at runtime. See [cache and deployment](./configuration.md#configuration-caching).

## Check application-specific compatibility {#application-compatibility}

Use Laravel's upgrade guides for shared APIs across [9.x](https://laravel.com/docs/9.x/upgrade), [10.x](https://laravel.com/docs/10.x/upgrade), [11.x](https://laravel.com/docs/11.x/upgrade), and [12.x](https://laravel.com/docs/12.x/upgrade). Apply the relevant changes using `WpStarter` namespaces and `ws_*` helpers; the WpStarter package supplies the framework changes, while you remain responsible for application overrides and dependencies.

Pay particular attention to:

- Custom mail transports and callbacks using `Swift_*`: 2.x uses Symfony Mailer/Mime. The bundled WordPress `wp` transport is already adapted, so ordinary mail templates can continue using `MAIL_MAILER=wp_mail`.
- Custom filesystem adapters, logging integrations, and date calculations: the inspected package uses Flysystem 3, Monolog 3, and Carbon 3.
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
