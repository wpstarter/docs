# Security and Private Configuration

Use the paths matching your [installation layout](./installation.md), including the [WordPress-root layout](./installation.md#wordpress-root-installation).

<!--@include: ../_parts/security.md-->

## Use a private PHP environment file {#php-environment-file}

Renaming dotenv text to `.env.php` or `env.php` does **not** make the loader execute PHP. `loadEnvironmentFrom()` changes a filename; the loader still parses dotenv syntax. A dotenv file with a `.php` extension can expose its raw text if requested through PHP, so changing its extension is not protection.

To use real PHP, keep the file outside the document root and load it after Composer autoload but before application/environment bootstrap. For example, create `/etc/wpstarter/example-plugin/env.php` readable by the PHP and CLI users:

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

Create `bootstrap/load-custom.php` in the application with this loader:

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

The skeleton automatically requires `bootstrap/load-custom.php` after Composer autoload and before application/environment bootstrap.

Use strings such as `'false'` and `'true'` for the environment values so `ws_env()` performs its usual boolean conversion. This populates PHP's environment arrays for framework lookup; it does not export values to subprocesses. Adapt the private absolute path to your deployment. A required file that is missing fails startup rather than silently supplying empty secrets.

Verify configuration before removing the old `.env` and its environment-specific variants from the deployment. Ensure any additional mail, cache, queue, or service settings are supplied too. Composer's skeleton scripts create `.env` and run key-generation commands, so review those scripts when adopting this layout; subsequent installations can recreate the old file. Normal `key:generate` writes to the configured dotenv file, not to this PHP array. For a new application only, `php artisan key:generate --show` displays a key to store privately; it does not update the PHP file. Avoid printing existing secrets during verification.

Alternatively, require a private PHP array directly from the relevant `config/*.php` files and map its values into configuration. That requires no environment emulation, but each configuration file must explicitly use those values. A real PHP file must still be access-protected; PHP handling and its extension are not substitutes for the server rules above.

## Move or rename the dotenv file {#custom-dotenv-path}

To keep dotenv outside the document root, add the following after `$app` is created in `bootstrap/app.php`, before the existing `return $app`:

```php
$app->useEnvironmentPath('/etc/wpstarter/example-plugin');
$app->loadEnvironmentFrom('application.env');
```

`application.env` still contains `KEY=value` text. Environment-specific selection (`APP_ENV` or CLI `--env`) can select a suffix such as `application.env.production`. Moving the file protects it from ordinary document-root requests; verify the private directory is not exposed through an alias and remains readable by the processes that need it. Adapt Composer scripts and key provisioning to this path, and rebuild configuration caches after changes.
