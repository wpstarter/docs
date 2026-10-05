# Plugin Structure

The skeleton keeps Laravel-style application folders but enters through WordPress. The files below determine the integration; most application work belongs in `app`, `routes`, and `resources`.

| Path | Role |
| --- | --- |
| `main.php` | WordPress plugin header and guarded entrypoint; defines `__WS_FILE__`, `WS_DIR`, and `WS_VERSION` |
| `WordpressStarter.php` | Coordinates WordPress hooks, early bootstrap, application bootstrap, and frontend dispatch |
| `bootstrap/autoload.php` | Loads WordPress if needed, Composer, optional custom bootstrap, and the starter class |
| `bootstrap/load-wp.php` | Finds a nearby configured WordPress installation for CLI/bootstrap use |
| `bootstrap/app.php` | Creates `WpStarter\Wordpress\Application` and binds HTTP/console kernels and exception handler |
| `app/Http/Kernel.php` | Frontend global middleware, groups, aliases; extends the WordPress kernel |
| `app/Providers/RouteServiceProvider.php` | Loads URL and shortcode route files |
| `routes/web.php` / `routes/api.php` | URL routes |
| `routes/wp.php` | WordPress shortcode routes |
| `app/Http/Controllers` | Frontend controller actions |
| `app/Admin/AdminServiceProvider.php` | Admin kernel binding, route group, and view namespace |
| `app/Admin/Kernel.php` | Independent admin middleware configuration |
| `app/Admin/routes/admin.php` | Menus and submenus |
| `app/Admin/Controllers` | Admin controllers with HTTP-method/action dispatch |
| `app/Admin/resources/views` | Views under `admin::`, including the application layout |
| `app/View/Components` | WordPress response components with optional `boot()` / `mount()` |
| `app/View/Shortcodes` | Components registered with the shortcode manager |
| `app/Providers/AppServiceProvider.php` | Application integration, sample shortcode registration, and text-domain loading |
| `app/Providers/SettingServiceProvider.php` | Defines the WordPress option key for application settings |
| `config` | Framework and WordPress service configuration |
| `resources/views` / `resources/lang` | Frontend Blade templates and translation resources |
| `vite.config.js` / `package.json` | Vite entrypoints and development/production build commands; existing Mix applications can keep their build setup |
| `public` | Public assets; not the application's request entrypoint |
| `storage` / `bootstrap/cache` | Runtime files and generated caches; require write access |
| `artisan` | Application CLI entrypoint with WordPress bootstrap |
| `vendor/wpstarter/framework/src/WpStarter/Wordpress` | WordPress integration implementation installed by Composer |

The three route files and the admin module use different facades and kernels. Start with [routing](./routing.md) before moving declarations between them.

Keep framework changes in the framework package's source repository rather than relying on edits under `vendor`, which a Composer update can replace. The skeleton's sample controllers, views, and routes are application examples you can adapt or remove.
