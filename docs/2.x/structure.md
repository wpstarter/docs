# Plugin Structure

The skeleton keeps Laravel-style application folders but enters through WordPress. The files below determine the integration; most application work belongs in `app`, `routes`, and `resources`.

| Path | Role |
| --- | --- |
| `main.php` | WordPress plugin header and guarded entrypoint; defines `__WS_FILE__`, `WS_DIR`, and `WS_VERSION` |
| `WordpressStarter.php` | Coordinates WordPress hooks, early bootstrap, application bootstrap, and frontend dispatch |
| `autoload.php` | Loads a nearby configured WordPress installation if needed, Composer, and the starter class |
| `bootstrap/providers.php` | Registers application service providers |
| `routes/console.php` | Artisan closure commands |
| `app/PluginsLoader.php` | Optional early rules for [conditional plugin loading](./plugins-loader.md); create this file when needed |
| `bootstrap/app.php` | Creates the WordPress application with `Application::configure()`; configures URL/console routes, frontend middleware, and exception rendering |
| `routes/web.php` | URL routes loaded by `withRouting()` with the `web` middleware group |
| `routes/wp.php` | WordPress shortcode routes |
| `app/Http/Controllers` | Frontend controller actions |
| `app/Admin/AdminServiceProvider.php` | Admin kernel binding, route group, and view namespace |
| `app/Admin/Kernel.php` | Independent admin middleware configuration |
| `app/Admin/routes/admin.php` | Menus and submenus |
| `app/Admin/Controllers` | Admin controllers with HTTP-method/action dispatch |
| `app/Admin/resources/views` | Views under `admin::`, including the application layout |
| `app/View/Components` (optional) | Create this directory for WordPress response components with optional `boot()` / `mount()` |
| `app/View/Shortcodes` | Components registered with the shortcode manager |
| `app/Providers/AppServiceProvider.php` | Loads shortcode routes, registers the sample shortcode, and loads the text domain |
| `app/Providers/SettingServiceProvider.php` | Defines the WordPress option key for application settings |
| `config` | Framework and WordPress service configuration |
| `resources/views` / `resources/lang` | Frontend Blade templates and translation resources |
| `vite.config.js` / `package.json` | Vite entrypoints and development/production build commands; existing Mix applications can keep their build setup |
| `public` | Public assets; not the application's request entrypoint |
| `storage` / `bootstrap/cache` | Runtime files and generated caches; require write access |
| `artisan` | Application CLI entrypoint with WordPress bootstrap |
| `vendor/wpstarter/framework/src/WpStarter/Wordpress` | WordPress integration implementation installed by Composer |

`Application::configure()` binds the framework's WordPress HTTP and console kernels. Configure frontend middleware through `withMiddleware()` and exception handling through `withExceptions()` in `bootstrap/app.php`. The admin module keeps its own `App\Admin\Kernel`.

URL, shortcode, and admin routes use different facades. Start with [routing](./routing.md) before moving declarations between them. An API route file is optional and must be added to `withRouting()` when needed.

Keep framework changes in the framework package's source repository rather than relying on edits under `vendor`, which a Composer update can replace. The skeleton's sample controllers, views, and routes are application examples you can adapt or remove.
