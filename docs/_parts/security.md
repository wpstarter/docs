- [What must stay private](#private-files)
- [Nginx](#nginx)
- [Apache](#apache)
- [Verify the deployed rules](#verify-access)
- [Run without a .env file](#without-dotenv)
- [Use a private PHP environment file](#php-environment-file)
- [Move or rename the dotenv file](#custom-dotenv-path)

HTTP requests enter through WordPress; the application's own directory should expose only its intended public assets.

## What must stay private {#private-files}

Block direct HTTP access to the application's `.env` files and backups, `app`, `bootstrap`, `config`, `database`, `resources`, `storage`, `vendor`, Composer files, and PHP entrypoints. `bootstrap/cache/config.php` contains resolved configuration and can contain secrets even after `.env` is removed. Logs, sessions, repository metadata, and deployment archives also belong outside public access.

The skeleton supplies an application-root `.htaccess` with `Order deny,allow` / `Deny from all`, and a public-directory `.htaccess` with `Allow from all`. Those are Apache rules; Nginx does not read them. The supplied `nginx-sample.conf` uses ordinary prefix locations and needs stronger location selection when combined with a site's generic PHP or static-file regex locations.

Deploy only browser-facing files under `public`. Never put secrets, PHP configuration, database dumps, or backups there. Disable `APP_DEBUG` and `APP_DEBUG_EXTERNAL` in production, keep secrets out of Git and build artifacts, and give the web process only the filesystem permissions it needs. WpStarter still needs write access to its runtime `storage` and `bootstrap/cache` directories.

## Nginx {#nginx}

Set the application's **URL path** once, without a trailing slash. On the server, run this shell block to generate the rules:

```shell
wsbaseuri='/wp-content/plugins/example-plugin'

sudo mkdir -p /etc/nginx/snippets
sudo tee /etc/nginx/snippets/wpstarter.conf >/dev/null <<NGINX
location = ${wsbaseuri} { return 404; }
location ^~ ${wsbaseuri}/ { return 404; }
location = ${wsbaseuri}/public { return 404; }

location ^~ ${wsbaseuri}/public/ {
    autoindex off;
    if (\$uri ~ "(^|/)[.]") { return 404; }
    if (\$uri !~* "[.](css|js|mjs|json|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|ogg|wav)$") {
        return 404;
    }
    try_files \$uri =404;
}
NGINX
```

For a WordPress-root installation, set `wsbaseuri='/example-plugin'`. If WordPress is served under a URL subdirectory, include that prefix. The existing WordPress `server` block must map this URI through its `root`; adapt the mapping for an `alias` or a separate asset host.

Add one include **inside that WordPress `server` block**, replacing any old WpStarter locations:

```nginx
include /etc/nginx/snippets/wpstarter.conf;
```

Only `public/` assets with the listed extensions are served; hidden paths, PHP, backups, and private application files return 404. Add extensions only for files intentionally shipped to browsers. `try_files` keeps missing assets from falling through to WordPress. The `^~` prefixes take precedence over generic PHP and static-file regex locations; check for any exact or longer locations that could override them. See [Nginx location selection](https://nginx.org/en/docs/http/ngx_http_core_module.html#location).

The shell expands `${wsbaseuri}` into literal paths and preserves Nginx's `$uri`. This generation step is necessary because [Nginx variables are not configuration macros](https://nginx.org/en/docs/faq/variables_in_config.html). To change the application path, update the first line and regenerate the snippet.

Check and reload using your host's service manager:

```shell
sudo nginx -t && sudo systemctl reload nginx
```

## Apache {#apache}

The bundled `.htaccess` files require the server to honor overrides and support the legacy access directives. On Apache 2.4 those directives use `mod_access_compat`. If overrides are disabled, the files do not protect the application.

In the Apache 2.4 virtual-host configuration, set the application's **absolute filesystem directory** once with [`Define`](https://httpd.apache.org/docs/2.4/mod/core.html#define). These paths refer to directories on disk, not URLs:

```apache
Define wsbasedir "/var/www/wordpress/wp-content/plugins/example-plugin"

<Directory "${wsbasedir}">
    AllowOverride None
    Options -Indexes
    Require all denied
</Directory>

<Directory "${wsbasedir}/public">
    AllowOverride None
    Options -Indexes
    Require all granted

    <FilesMatch "(?i)(^\.|\.(?:php[0-9]*|phtml|phar)(?:\.|$)|\.(?:bak|old|orig|save|swp|sql|zip|tar|gz)$)">
        Require all denied
    </FilesMatch>
</Directory>

UnDefine wsbasedir
```

`AllowOverride None` makes the virtual-host rules authoritative instead of combining them with the bundled `.htaccess` files. The public directory remains an asset directory; publish no private files there. For a WordPress-root installation, change only the `Define wsbasedir` value. Check the complete configuration for other authorization sections and public-directory handlers.

If your host only allows `.htaccess`, ask it to enable the appropriate overrides. For Apache 2.4, you can replace the application-root access directives with `Require all denied`, and replace the public-directory access directive with `Require all granted`, adding the `Options` and `FilesMatch` restrictions above where permitted. Replace the legacy directives rather than mixing both syntaxes. See [Apache's access-control guidance](https://httpd.apache.org/docs/2.4/en/howto/access.html) and [override configuration](https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride).

Validate with your platform's `apachectl configtest` (or `httpd -t`) before reloading the server. Direct HTTP access to `main.php` can be blocked: WordPress loads the plugin through a local PHP include, which these HTTP access rules do not prevent.

## Verify the deployed rules {#verify-access}

Set the public application URL once, then test the deployed origin with GET requests that discard the response body:

```shell
wsbaseurl='https://example.com/wp-content/plugins/example-plugin'

for private_path in .env bootstrap/cache/config.php public/index.php; do
    curl -sS -o /dev/null -w '%{http_code}\n' "$wsbaseurl/$private_path"
done
```

Private URLs must return 403 or 404 without exposing their contents or executing application PHP. Also check `.env.production`, `.env.bak`, `env.php`, `vendor/autoload.php`, a real log file, and hidden files under `public`. Check an **existing** deployed CSS/JS/image asset returns 200, and that the normal WordPress frontend, admin, and WpStarter routes still work. A 404 for a nonexistent test file alone does not prove the access rules are effective.

For a WordPress-root application, set `wsbaseurl='https://example.com/example-plugin'`. These commands use a POSIX shell; on Windows, run them in WSL or Git Bash, or test each URL with `curl.exe -o NUL`. Repeat the checks after web-server changes and for an origin exposed separately from a CDN. If secrets were previously served, remove access and rotate the exposed credentials; removing the URL does not invalidate downloaded copies.

## Run without a .env file {#without-dotenv}

WpStarter uses dotenv's `safeLoad()`: a missing file is allowed. You can supply deployment values through the PHP process environment, WordPress constants explicitly read by `config/*.php`, or a private PHP file. Provide the settings your application needs, especially a stable `APP_KEY`; keep the existing key when changing configuration storage.

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
