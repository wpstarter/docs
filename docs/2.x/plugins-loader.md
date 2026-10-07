# Conditional Plugin Loading

- [Load the rules early](#load-the-rules-early)
- [Choose plugins for a request](#choose-plugins)
- [Match requests](#match-requests)
- [Rule order and scope](#rule-order-and-scope)

`WpStarter\Wordpress\Plugins\Loader` filters WordPress's active plugin list for the current request. Use it to avoid loading plugins that a particular endpoint does not need. It leaves the stored activation list unchanged.

## Load the rules early {#load-the-rules-early}

Create `app/PluginsLoader.php`. The skeleton's starter installs the loader's `option_active_plugins` filter and requires this file after early bootstrap, before application providers boot. There is no need to call `run()` yourself.

To affect the initial loading of regular plugins reliably, load WpStarter as a must-use plugin using the [WordPress-root installation](./installation.md#wordpress-root-installation). When WpStarter is itself a regular plugin, WordPress has already read the list used to load regular plugins before entering its `main.php`; the loader cannot undo that load.

The rules execute before the main WordPress query and normal provider bootstrap. Match the request path, method, host, or input here. Avoid controller dispatch, container-injected application services, and query-dependent checks such as `is_singular()`.

## Choose plugins for a request {#choose-plugins}

```php
<?php
// app/PluginsLoader.php
use WpStarter\Wordpress\Plugins\Loader as PluginsLoader;

$loader = PluginsLoader::getInstance();

// Keep only these already-active regular plugins for this endpoint.
$loader->get('api/catalog')->only(
    'woocommerce/woocommerce.php',
    'catalog-extension/main.php'
);

// Keep the other active plugins, excluding this one on these pages.
$loader->get('reports/*')->excerpt('heavy-widget/main.php');
```

Plugin identifiers are paths relative to the regular plugins directory, such as `woocommerce/woocommerce.php`. `only()` and `excerpt()` accept an array or multiple arguments. The exclusion method is spelled **`excerpt()`** in this API.

Both methods accept `*` wildcard patterns or closures receiving a plugin path:

```php
$loader->get('api/export')->excerpt('analytics/*');

$loader->get('api/preview')->only(function ($plugin) {
    return str_starts_with($plugin, 'preview-');
});
```

An allowlist keeps matching entries from the incoming active list; it does not activate or load an inactive plugin. Keep required dependencies in the allowlist. A nonempty `only()` list takes precedence if both lists are set on one rule. Without either list, the rule leaves the incoming plugins unchanged.

## Match requests {#match-requests}

| API | Matching behavior |
| --- | --- |
| `get($uri)` | GET and HEAD |
| `post()`, `put()`, `patch()`, `delete()`, `options()` | The corresponding HTTP method |
| `match($methods, $uri)` | The supplied methods; GET also includes HEAD |
| `any($uri)` | GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS |
| `domain($host)` | Exact request host; use a hostname without a scheme |
| `where($key, $value)` | Strict equality against `$request->input($key)` |

String URIs use `$request->is()`: write paths without a leading slash and use `*` for wildcard matching. These are request patterns, not frontend routes; they do not dispatch a controller or extract `{id}` parameters.

```php
$loader->post('wp-admin/admin-ajax.php')
    ->where('action', 'catalog_export')
    ->excerpt('analytics/*');

$loader->get('catalog/*')
    ->domain('shop.example.com')
    ->excerpt('heavy-widget/*');
```

Query/form values are usually strings, so `where('mode', '1')` differs from `where('mode', 1)`. All declared `where()` conditions must match. A closure URI gives complete control over request matching after the domain check:

```php
use WpStarter\Http\Request;

$loader->any(function (Request $request) {
    return $request->is('api/catalog/*')
        && $request->query('preview') === '1';
})->excerpt('analytics/*');
```

A closure URI returns its own match result and bypasses the rule's `where()` checks; put the conditions inside that closure. An optional second callback for a string URI is a matching predicate receiving the request, not a controller action. If `where()` conditions exist, they take precedence over that predicate.

## Rule order and scope {#rule-order-and-scope}

The first matching rule for the request method wins. Its plugin filter runs once for that evaluation; matching rules are not combined. Rules marked `fallback()` are considered after ordinary rules, but must still match their URI and conditions:

```php
$loader->any('*')->excerpt('legacy-widget/*')->fallback();
```

Use distinct URI patterns or closure URIs for separate cases. Rules with the same method and domain/URI collection key replace earlier entries; different `where()` conditions alone do not create distinct entries. Chained `domain()` changes the matching constraint after insertion, so it also does not create a separate collection key for otherwise identical registrations. `current()` returns the rule selected by the latest evaluation.

The filter covers regular plugins from `option_active_plugins`. Must-use plugins, network-activated plugins, and plugins already loaded are outside its control. Register rules here rather than in `routes/web.php` or a provider's `boot()`, which run after regular plugins have loaded.
