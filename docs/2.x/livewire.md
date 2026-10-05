# Livewire Integration

WpStarter provides a bridge for loading Livewire assets through WordPress. Component APIs and version-specific behavior belong in the documentation for your installed Livewire package.

## Install the integration package

```shell
composer require wpstarter/livewire
```

Check the installed package version and its dependency constraints before following upstream examples. Choose a release compatible with WpStarter 2.x; an old integration package intended for the Laravel 8.x-based framework may prevent the Composer upgrade. Do not assume APIs from the newest Livewire release apply to the package you installed.

## Theme-rendered frontend pages

For a shortcode or content response rendered inside the WordPress theme, enqueue Livewire assets from the controller or a provider:

```php
use WpStarter\Wordpress\Facades\Livewire;

Livewire::enqueue();

return shortcode_view('catalog.index');
```

The bridge prints styles at `wp_print_styles:11` and scripts at `wp_print_footer_scripts:9`. The theme must call the normal header/footer hooks. Enqueuing in a controller limits assets to that request; enqueuing in a provider applies them to all relevant pages.

`ws_enqueue_livewire($styleOptions, $scriptOptions)` is the frontend helper equivalent. Enqueueing returns false if the expected `Livewire\Livewire` class is unavailable and avoids duplicate registration within the request.

## WordPress admin pages

Use the separate admin integration:

```php
\WpStarter\Wordpress\Facades\Livewire::enqueueAdmin();

return ws_view('admin::sample');
```

It prints assets at `admin_print_styles:11` and `admin_print_footer_scripts:9`. Frontend `enqueue()` does not register these admin hooks.

## Standalone page layouts

For a layout that supplies its own complete HTML, use the package's Blade directives:

```blade
<head>
    @livewireStyles
</head>
<body>
    <livewire:counter />
    @livewireScripts
</body>
```

Choose one asset-loading approach per page to avoid duplicate output. Creating components and using their lifecycle, validation, events, or bindings is outside this bridge's scope. Follow the documentation matching the version resolved by Composer.
