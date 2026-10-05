# Views, Shortcodes, and Theme Integration

- [Choose a rendering boundary](#choose-a-rendering-boundary)
- [Use Blade with the theme](#use-blade-with-the-theme)
- [Full-page views](#full-page-views)
- [WordPress response components](#wordpress-response-components)
- [Registered shortcodes](#registered-shortcodes)

## Choose a rendering boundary {#choose-a-rendering-boundary}

Blade views live in `resources/views`; admin views live in `app/Admin/resources/views`. The Blade syntax and general view API follow [Laravel 12.x's Blade documentation](https://laravel.com/docs/12.x/blade). Use `ws_view()` for a normal view, then choose the response boundary:

| Desired result | Return from a frontend controller |
| --- | --- |
| Own the HTTP response | `ws_view('page', $data)` |
| Own the full page, optionally sending at a WordPress hook | `wp_view('page', $data)` |
| Keep the theme, replace filtered content | `content_view('fragment', $data)` |
| Keep the theme and surrounding content, replace shortcode output | `shortcode_view('fragment', $data)` |

See [controller responses](./controllers.md#return-values) for headers, title filters, termination, and scope limitations. In admin controllers, `ws_view('admin::page')` is embedded in the admin shell instead.

## Use Blade with the theme {#use-blade-with-the-theme}

A shortcode response renders a fragment, so avoid another `<html>` or `<body>` wrapper:

```blade
{{-- resources/views/catalog/index.blade.php --}}
<section class="catalog">
    <h2>{{ $category }}</h2>
    <p>Showing up to {{ $limit }} items.</p>
</section>
```

```php
return shortcode_view('catalog.index', [
    'category' => 'Books',
    'limit' => 12,
]);
```

The theme still controls the surrounding layout and runs its normal asset hooks. Queue resources in the controller or provider before those hooks print them. A content response works similarly, but filters `the_content` rather than registering a tag.

## Full-page views {#full-page-views}

A `wp_view()` response owns the complete output. If the page should use WordPress-managed scripts and styles, include the corresponding hooks in its layout:

```blade
<!doctype html>
<html {!! get_language_attributes() !!}>
<head>
    <meta charset="{{ get_bloginfo('charset') }}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @php wp_head(); @endphp
</head>
<body>
    @php wp_body_open(); @endphp
    @yield('content')
    @php wp_footer(); @endphp
</body>
</html>
```

This layout assumes WordPress has reached template rendering; use a shortcode route or a URL route with `->hook('template_redirect', ...)`. If you need WordPress's document title, add appropriate title output or theme support to your full-page layout. A plain standalone `ws_view()` can instead supply its own assets directly.

## WordPress response components {#wordpress-response-components}

The WordPress response helpers accept a Blade view name, a view object, a closure, or a `WpStarter\Wordpress\View\Component` instance. Components are useful when preparation must occur separately from rendering.

```php
namespace App\View\Components;

use WpStarter\Wordpress\View\Component;

class CatalogHeading extends Component
{
    public function boot()
    {
        ws_enqueue_css('catalog', ws_asset('css/catalog.css'));
    }

    public function mount()
    {
        $this->response->withPostTitle('Catalog');
    }

    public function render()
    {
        return ws_view('catalog.heading', $this->data)->render();
    }
}
```

```php
return content_view(new \App\View\Components\CatalogHeading(), [
    'category' => 'Books',
]);
```

The response assigns itself to each component, then calls `boot()` once during response handling. It calls `mount()` once before the first relevant title/content rendering or full-page send. Both lifecycle methods use container invocation and can receive injected services. `render()` runs when content is requested and should return renderable output without echoing.

A closure becomes a component whose render callback receives the merged view data array:

```php
return shortcode_view(function (array $data) {
    return '<strong>'.esc_html($data['label']).'</strong>';
}, ['label' => 'Catalog']);
```

These are WordPress response components, distinct from Blade `<x-...>` components and from Livewire components.

## Registered shortcodes {#registered-shortcodes}

Use a registered shortcode for independent blocks, especially when the same tag occurs more than once with different attributes. The skeleton registers `App\View\Shortcodes\SampleShortcode` in `AppServiceProvider::boot()`.

```php
namespace App\View\Shortcodes;

use WpStarter\Wordpress\View\Shortcode;

class CatalogCard extends Shortcode
{
    protected $tag = 'catalog-card';

    public function render()
    {
        return ws_view('catalog.card', [
            'category' => $this->attribute('category', 'all'),
            'content' => $this->content,
        ])->render();
    }
}
```

```php
// AppServiceProvider::boot()
\WpStarter\Wordpress\Facades\Shortcode::add(
    \App\View\Shortcodes\CatalogCard::class
);
```

For each occurrence, the manager supplies attributes and enclosed content, invokes `mount()` if it exists, renders, and calls `cleanup()`. Escape output in the view as appropriate; enclosed content is not automatically passed through `do_shortcode()`.

An optional `boot()` runs at `template_redirect:10` when the manager finds the tag in the queried singular post's content. Rendering a tag elsewhere still invokes its callback, but does not guarantee this early `boot()` call. The manager retains the component instance; reset any per-occurrence mutable state in `cleanup()` when needed.

A registered shortcode supplies its own rendering callback and does not need a route. A shortcode route supplies request-level control, middleware, and a response. Returning a `shortcode_view()` for a tag also registered by the manager replaces that tag's callback for the current request.
