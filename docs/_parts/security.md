- [What must stay private](#private-files)
- [Nginx](#nginx)
- [Apache](#apache)
- [Verify the deployed rules](#verify-access)
- [Run without a .env file](#without-dotenv)
- [Use a private PHP environment file](#php-environment-file)
- [Move or rename the dotenv file](#custom-dotenv-path)

HTTP requests enter through WordPress; the application's own directory should expose only its intended public assets.

::: warning Public directory
Files in `public` can be accessed directly from the Internet. Keep sensitive files such as `access.json`, credentials, tokens, and private configuration outside this directory.
:::

## What must stay private {#private-files}

Block direct HTTP access to the application's `.env` files and backups, `app`, `bootstrap`, `config`, `database`, `resources`, `storage`, `vendor`, Composer files, and PHP entrypoints. `bootstrap/cache/config.php` contains resolved configuration and can contain secrets even after `.env` is removed. Logs, sessions, repository metadata, and deployment archives also belong outside public access.

The skeleton supplies Apache `.htaccess` files. Nginx does not read them, so add the Nginx rule below to protect the application directory.

Deploy only browser-facing files under `public`. Never put secrets, PHP configuration, database dumps, or backups there. Disable `APP_DEBUG` and `APP_DEBUG_EXTERNAL` in production, keep secrets out of Git and build artifacts, and give the web process only the filesystem permissions it needs. WpStarter still needs write access to its runtime `storage` and `bootstrap/cache` directories.

## Nginx {#nginx}

Inside the existing WordPress `server` block, add this rule **before generic PHP and static-file regex locations**:

```nginx
location ~ ^/wp-content/plugins/example-plugin(?=/|$)(?!/public(?:/|$)) {
    deny all;
}
```

Replace `/wp-content/plugins/example-plugin` with the application's URL path, without a trailing slash. For a WordPress-root installation at `/wpstarter`, use `/wpstarter`. Include any WordPress URL subdirectory in the path, and escape regex metacharacters such as `.` if they occur in the directory name.

The rule returns 403 for the application directory and everything outside its `public` directory. Requests under `public/` continue through the site's existing file-serving configuration, with no extension allowlist. Only put files intended for direct URL access there.

Replace old WpStarter locations rather than keeping conflicting rules. An exact `location` or a matching `^~` prefix can bypass this regex; the rule must also precede other matching regex locations. See [Nginx location selection](https://nginx.org/en/docs/http/ngx_http_core_module.html#location).

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
</Directory>

UnDefine wsbasedir
```

`AllowOverride None` makes the virtual-host rules authoritative instead of combining them with the bundled `.htaccess` files. The public directory remains an asset directory; publish no private files there. For a WordPress-root installation, change only the `Define wsbasedir` value. Check the complete configuration for other authorization sections and public-directory handlers.

If your host only allows `.htaccess`, ask it to enable the appropriate overrides. For Apache 2.4, you can replace the application-root access directives with `Require all denied`, and replace the public-directory access directive with `Require all granted`. Replace the legacy directives rather than mixing both syntaxes. See [Apache's access-control guidance](https://httpd.apache.org/docs/2.4/en/howto/access.html) and [override configuration](https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride).

Validate with your platform's `apachectl configtest` (or `httpd -t`) before reloading the server. Direct HTTP access to `main.php` can be blocked: WordPress loads the plugin through a local PHP include, which these HTTP access rules do not prevent.

## Verify the deployed rules {#verify-access}

Set the public application URL once, then test the deployed origin with GET requests that discard the response body:

```shell
wsbaseurl='https://example.com/wp-content/plugins/example-plugin'

for private_path in .env bootstrap/cache/config.php vendor/autoload.php; do
    curl -sS -o /dev/null -w '%{http_code}\n' "$wsbaseurl/$private_path"
done
```

Private URLs must return 403 or 404 without exposing their contents or executing application PHP. Also check `.env.production`, `.env.bak`, `env.php`, and a real log file outside `public`. Check an **existing** deployed asset under `public/` returns 200, and that the normal WordPress frontend, admin, and WpStarter routes still work. A 404 for a nonexistent test file alone does not prove the access rules are effective.

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
