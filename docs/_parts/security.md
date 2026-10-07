- [What must stay private](#private-files)
- [Nginx](#nginx)
- [Apache](#apache)
- [Verify the deployed rules](#verify-access)
- [Run without a .env file](#without-dotenv)
- [Use a private PHP environment file](#php-environment-file)
- [Move or rename the dotenv file](#custom-dotenv-path)

This guidance applies to both WpStarter 1.x and 2.x. HTTP requests enter through WordPress; the application's own directory should expose only its intended public assets.

## What must stay private {#private-files}

Block direct HTTP access to the application's `.env` files and backups, `app`, `bootstrap`, `config`, `database`, `resources`, `storage`, `vendor`, Composer files, and PHP entrypoints. `bootstrap/cache/config.php` contains resolved configuration and can contain secrets even after `.env` is removed. Logs, sessions, repository metadata, and deployment archives also belong outside public access.

Both skeletons supply an application-root `.htaccess` with `Order deny,allow` / `Deny from all`, and a public-directory `.htaccess` with `Allow from all`. Those are Apache rules; Nginx does not read them. The supplied `nginx-sample.conf` uses ordinary prefix locations and needs stronger location selection when combined with a site's generic PHP or static-file regex locations.

Deploy only browser-facing files under `public`. Never put secrets, PHP configuration, database dumps, or backups there. Disable `APP_DEBUG` and `APP_DEBUG_EXTERNAL` in production, keep secrets out of Git and build artifacts, and give the web process only the filesystem permissions it needs. WpStarter still needs write access to its runtime `storage` and `bootstrap/cache` directories.

## Nginx {#nginx}

Add the following locations **inside the existing WordPress `server` block**. This example assumes its `root` points to the WordPress directory and the application is installed at `wp-content/plugins/example-plugin`. Keep the site's existing WordPress permalink and PHP-FPM configuration.

```nginx
# Reject the application directory itself and every private child path.
location = /wp-content/plugins/example-plugin {
    return 404;
}

location ^~ /wp-content/plugins/example-plugin/ {
    return 404;
}

# The longer public prefix permits only selected static asset types.
location = /wp-content/plugins/example-plugin/public {
    return 404;
}

location ^~ /wp-content/plugins/example-plugin/public/ {
    autoindex off;

    # ^~ skips global regex locations, including global dotfile rules.
    # Therefore reject hidden path segments here as well.
    if ($uri ~ "(^|/)\.") {
        return 404;
    }

    # These if blocks only return a status; they do not rewrite or proxy.
    # Extend this list only for file types intentionally shipped to browsers.
    if ($uri !~* "\.(?:css|js|mjs|json|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|ogg|wav)$") {
        return 404;
    }

    # Missing assets must not fall through to WordPress or PHP.
    try_files $uri =404;
}
```

The longer `public/` prefix selects the asset location; `^~` keeps a global regex such as `location ~ \.php$` or a CSS/JS caching rule from overriding these prefixes. The asset location serves static files only: it has no FastCGI handler and excludes PHP, `.env`, backup files, and source maps. These rules follow [Nginx's documented location selection](https://nginx.org/en/docs/http/ngx_http_core_module.html#location).

For a WordPress-root application at `example-plugin/`, replace **every** `/wp-content/plugins/example-plugin` prefix above with `/example-plugin`. If WordPress is publicly served under `/wordpress`, include that URI prefix too. Location paths are URL paths, not filesystem paths; adapt the mapping if your server uses `alias`, symlinks, or a separate asset hostname.

Replace the old sample locations instead of adding conflicting duplicates. Check for exact locations, longer prefixes, or nested locations that could override these rules. Avoid an `error_page` fallback that turns these denials into a successful WordPress page. Apply the same protection to every origin/server block or alias exposing the application.

Check syntax before reloading on the server:

```shell
sudo nginx -t
sudo systemctl reload nginx
```

Reload only after the syntax check succeeds; use your host's reload mechanism if it does not use systemd. Nginx configuration is server-side configuration, so copying `nginx-sample.conf` into the plugin directory alone does not activate it.

## Apache {#apache}

The bundled `.htaccess` files require the server to honor overrides and support the legacy access directives. On Apache 2.4 those directives use `mod_access_compat`. If overrides are disabled, the files do not protect the application.

When you control the virtual host, you can enforce protection there using Apache 2.4 authorization syntax. Replace the absolute filesystem paths below; these are directories on disk, not URL prefixes:

```apache
<Directory "/var/www/wordpress/wp-content/plugins/example-plugin">
    AllowOverride None
    Options -Indexes
    Require all denied
</Directory>

<Directory "/var/www/wordpress/wp-content/plugins/example-plugin/public">
    AllowOverride None
    Options -Indexes
    Require all granted

    <FilesMatch "(?i)(^\.|\.(?:php[0-9]*|phtml|phar)(?:\.|$)|\.(?:bak|old|orig|save|swp|sql|zip|tar|gz)$)">
        Require all denied
    </FilesMatch>
</Directory>
```

`AllowOverride None` makes the virtual-host rules authoritative instead of combining them with the bundled `.htaccess` files. The public directory remains an asset directory; publish no private files there. Adapt the filesystem paths for a WordPress-root installation. Check the complete configuration for other authorization sections and public-directory handlers.

If your host only allows `.htaccess`, ask it to enable the appropriate overrides. For Apache 2.4, you can replace the application-root access directives with `Require all denied`, and replace the public-directory access directive with `Require all granted`, adding the `Options` and `FilesMatch` restrictions above where permitted. Replace the legacy directives rather than mixing both syntaxes. See [Apache's access-control guidance](https://httpd.apache.org/docs/2.4/en/howto/access.html) and [override configuration](https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride).

Validate with your platform's `apachectl configtest` (or `httpd -t`) before reloading the server. Direct HTTP access to `main.php` can be blocked: WordPress loads the plugin through a local PHP include, which these HTTP access rules do not prevent.

## Verify the deployed rules {#verify-access}

Test the real deployed origin with GET requests that discard the response body. For the plugin-directory example:

```shell
curl -sS -o /dev/null -w '%{http_code}\n' https://example.com/wp-content/plugins/example-plugin/.env
curl -sS -o /dev/null -w '%{http_code}\n' https://example.com/wp-content/plugins/example-plugin/bootstrap/cache/config.php
curl -sS -o /dev/null -w '%{http_code}\n' https://example.com/wp-content/plugins/example-plugin/public/index.php
```

Private URLs must return 403 or 404 without exposing their contents or executing application PHP. Also check `.env.production`, `.env.bak`, `env.php`, `vendor/autoload.php`, a real log file, and hidden files under `public`. Check an **existing** deployed CSS/JS/image asset returns 200, and that the normal WordPress frontend, admin, and WpStarter routes still work. A 404 for a nonexistent test file alone does not prove the access rules are effective.

Use `/example-plugin/...` for a WordPress-root application. On Windows, replace `/dev/null` with `NUL` and use `curl.exe`. Repeat the checks after web-server changes and for an origin exposed separately from a CDN. If secrets were previously served, remove access and rotate the exposed credentials; removing the URL does not invalidate downloaded copies.

## Run without a .env file {#without-dotenv}

Both framework versions use dotenv's `safeLoad()`: a missing file is allowed. You can supply deployment values through the PHP process environment, WordPress constants explicitly read by `config/*.php`, or a private PHP file. Provide the settings your application needs, especially a stable `APP_KEY`; keep the existing key when changing configuration storage.

For server-managed environment variables, make them available to both PHP-FPM and CLI/queue processes. A variable exported in your shell is not automatically available in PHP-FPM. FPM's `clear_env` defaults to enabled; pass the required variables explicitly in the pool or hosting configuration. See the [PHP-FPM configuration manual](https://www.php.net/manual/en/install.fpm.configuration.php). Keep secrets in protected server configuration, not in URLs or browser-facing FastCGI responses.

For values already in `wp-config.php`, read a dedicated constant explicitly in the relevant application config file:

```php
// wp-config.php, before WordPress loads:
define('EXAMPLE_APP_KEY', 'base64:YOUR_EXISTING_APPLICATION_KEY');

// Replace the 'key' entry in config/app.php:
'key' => defined('EXAMPLE_APP_KEY') ? EXAMPLE_APP_KEY : ws_env('APP_KEY'),
```

The existing `wpdb` connection already reads WordPress database constants; it does not need a second copy of those credentials in `.env`. Protect `wp-config.php` using the site's own server rules as well.

With configuration caching enabled, the environment-file bootstrap is skipped and the cached configuration is used. Rebuild `config:cache` with the intended deployment values after changes. Removing `.env` does not remove secrets from that cache. Keep `ws_env()` calls in configuration files and use `ws_config()` in application code.

## Use a private PHP environment file {#php-environment-file}

Renaming dotenv text to `.env.php` or `env.php` does **not** make the loader execute PHP. `loadEnvironmentFrom()` changes a filename; the loader still parses dotenv syntax. A dotenv file with a `.php` extension can expose its raw text if requested through PHP, so changing its extension is not protection.

To use real PHP, keep the file outside the document root and require it through the skeleton's existing `bootstrap/load-custom.php` hook. Both versions run this hook after Composer autoload and before application/environment bootstrap. For example, create `/etc/wpstarter/example-plugin/env.php` readable by the PHP and CLI users:

```php
<?php
// Private deployment file; never place it under public or commit it.
return [
    'APP_KEY' => 'base64:YOUR_EXISTING_APPLICATION_KEY',
    'APP_URL' => 'https://example.com',
    'APP_ENV' => 'production',
    'APP_DEBUG' => 'false',
    'APP_DEBUG_EXTERNAL' => 'false',
    'SESSION_DRIVER' => 'file',
];
```

Create `bootstrap/load-custom.php` in the application:

```php
<?php
$privateEnvironment = require '/etc/wpstarter/example-plugin/env.php';
$environmentRepository = \WpStarter\Support\Env::getRepository();

foreach ($privateEnvironment as $name => $value) {
    if (!is_string($name) || !is_string($value)) {
        throw new \RuntimeException('Private environment entries must be strings.');
    }

    // Preserve values already supplied by the deployment environment.
    if ($environmentRepository->get($name) === null) {
        $_ENV[$name] = $_SERVER[$name] = $value;
    }
}

unset($privateEnvironment, $environmentRepository, $name, $value);
```

Use strings such as `'false'` and `'true'` for the environment values so `ws_env()` performs its usual boolean conversion. This populates PHP's environment arrays for framework lookup; it does not export values to subprocesses. Adapt the private absolute path to your deployment. A required file that is missing fails startup rather than silently supplying empty secrets.

Verify configuration before removing the old `.env` and its environment-specific variants from the deployment. Ensure any additional mail, cache, queue, or service settings are supplied too. Composer's skeleton scripts create `.env` and run key-generation commands, so review those scripts when adopting this layout; subsequent installations can recreate the old file. Normal `key:generate` writes to the configured dotenv file, not to this PHP array. For a new application only, `php artisan key:generate --show` displays a key to store privately; it does not update the PHP file. Avoid printing existing secrets during verification.

Alternatively, require a private PHP array directly from the relevant `config/*.php` files and map its values into configuration. That requires no environment emulation, but each configuration file must explicitly use those values. A real PHP file must still be access-protected; PHP handling and its extension are not substitutes for the server rules above.

## Move or rename the dotenv file {#custom-dotenv-path}

If you prefer dotenv syntax, both application versions support moving the file outside the document root. Add this after creating `$app` in `bootstrap/app.php`, before returning it:

```php
$app->useEnvironmentPath('/etc/wpstarter/example-plugin');
$app->loadEnvironmentFrom('application.env');
```

`application.env` still contains `KEY=value` text. Environment-specific selection (`APP_ENV` or CLI `--env`) can select a suffix such as `application.env.production`. Moving the file protects it from ordinary document-root requests; verify the private directory is not exposed through an alias and remains readable by the processes that need it. Adapt Composer scripts and key provisioning to this path, and rebuild configuration caches after changes.
