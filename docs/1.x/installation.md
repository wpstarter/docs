# Installation

- [Install WpStarter in the WordPress root](#installation-via-composer)
- [Load WpStarter as a must-use plugin](#wordpress-root-installation)
- [Initial configuration](#initial-configuration)
- [Try the supplied examples](#try-the-supplied-examples)

WpStarter runs an application inside WordPress. Its framework uses Laravel-style APIs under the `WpStarter` namespace and integrates routing, views, authentication, database access, and mail with WordPress. These docs focus on that integration. For shared framework concepts, use the Laravel 8.x documentation.

## Install WpStarter in the WordPress root {#installation-via-composer}

The recommended setup is to install WpStarter in a `wpstarter` directory at the root of your existing WordPress installation, beside `wp-load.php`, and load it through a must-use plugin loader.

```shell
cd /path/to/wordpress
composer create-project "wpstarter/wpstarter:1.*" wpstarter
```

The 1.x skeleton uses `wpstarter/framework` 1.x. Use the project's Composer requirements and lockfile to determine the PHP version and extensions for your deployment.

Composer's install scripts create `.env` and generate the application key; verify that `APP_KEY` is populated.

The application entrypoint is now `/path/to/wordpress/wpstarter/main.php`. Its CLI bootstrap searches for `wp-load.php` relative to the project.

## Load WpStarter as a must-use plugin {#wordpress-root-installation}

Create the `wp-content/mu-plugins` directory if it does not exist, then create `wp-content/mu-plugins/wpstarter.php` with this loader:

```php
<?php
/**
 * Plugin Name: WpStarter
 */
require_once ABSPATH . 'wpstarter/main.php';
```

WordPress automatically loads this file as a must-use plugin; no activation in the WordPress admin is needed. Keep the loader directly inside `mu-plugins` so WordPress discovers it. The application itself stays in the WordPress-root `wpstarter` directory.

The entrypoint guards against loading another copy through `__WS_FILE__`; plan for one WpStarter application entrypoint per WordPress installation with this skeleton.

Run application commands from the `wpstarter` directory:

```shell
cd /path/to/wordpress/wpstarter
php artisan list
```

The plugin bootstrap loads WordPress before Composer's autoloader and the application. This is different from a standalone Laravel project; do not configure the web server to use this skeleton as an independent Laravel `public/index.php` application.

Installing in `wp-content/plugins/wpstarter` and activating `main.php` as a regular plugin is also possible, but is not recommended.

## Initial configuration {#initial-configuration}

Review [WordPress configuration](./configuration.md), especially:

- `APP_URL` for the site's URL and `APP_KEY` for encrypted cookies.
- `APP_DEBUG=false` and `APP_DEBUG_EXTERNAL=false` for production.
- Writable `storage` and `bootstrap/cache` directories.
- The default `wpdb` connection, WordPress authentication guard, and `wp_mail` mailer.
- Web-server access rules for the application directory.

The skeleton supplies Apache `.htaccess` files and an Nginx sample, but their protection depends on the active web-server configuration. Nginx needs explicit server rules that also account for PHP/static regex locations. Follow [Security and Private Configuration](./security.md) for Apache and Nginx examples, deployment checks, and alternatives to `.env`. Requests to the WordPress site still enter through WordPress.

## Try the supplied examples {#try-the-supplied-examples}

The skeleton contains examples that demonstrate the three request flows:

| Example | What it demonstrates |
| --- | --- |
| Visit `/welcome` relative to the WordPress site | URL action returning `ws_view()`; also creates the shortcode demo page if absent |
| Visit the created `welcome-shortcode-page` | `[welcome-shortcode]` dispatches a shortcode route and preserves the theme |
| Visit `/welcome-page` | URL action creates a matching WordPress page if needed and returns `content_view()` |
| Open the WpStarter sample admin menu | Class-based admin action dispatch, Blade layout, validation, notices, and redirects |
| Add `[sample-shortcode]` to content | Registered shortcode component from `AppServiceProvider` |

The welcome controllers create published demo pages on GET requests. Remove or adapt these examples before shipping your own plugin. The sample admin page demonstrates the mechanics; review its capabilities and middleware before using it for privileged operations.

Continue with [plugin structure](./structure.md), [routing](./routing.md), and [admin development](./admin.md).
