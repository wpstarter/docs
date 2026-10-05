# Routing: URLs and WordPress Pages

- [Choose a router](#choose-a-router)
- [URL routes](#basic-routing)
- [WordPress shortcode routes](#wordpress-routes)
- [Shortcode attributes](#shortcode-attributes)
- [Forms and HTTP methods](#forms-and-http-methods)
- [Middleware and bindings](#middleware-and-bindings)
- [Dispatch at a WordPress hook](#dispatch-at-a-wordpress-hook)
- [Admin routes](#admin-routes)

## Choose a router {#choose-a-router}

WpStarter has three routers. Choose according to how WordPress should participate in the request.

| Route file in the skeleton | Facade | Matches | Default middleware |
| --- | --- | --- | --- |
| `routes/web.php` | `WpStarter\Support\Facades\Route` | URL path and HTTP method | `web` |
| `routes/api.php` | `WpStarter\Support\Facades\Route` | URL path and HTTP method | `api` |
| `routes/wp.php` | `WpStarter\Wordpress\Facades\Route` | Shortcode tag in the queried singular post's content and HTTP method | `web` |
| `app/Admin/routes/admin.php` | `WpStarter\Wordpress\Admin\Facades\Route` | Registered WordPress admin screen and HTTP method | `admin` |

`App\Providers\RouteServiceProvider` loads the frontend files. `App\Admin\AdminServiceProvider` loads the admin file. These are skeleton conventions; inspect the providers when changing their groups.

URL routes run first, normally at `init:1`. If the URL router cannot match a route, the WordPress kernel schedules shortcode routing at `template_redirect:1`, after WordPress has resolved its main query. If neither router matches, WordPress continues with its normal template. A matched route returning a 404 response does not trigger this fallback.

## URL routes {#basic-routing}

Use URL routes for endpoints whose paths your application owns:

```php
// routes/web.php
use WpStarter\Support\Facades\Route;

Route::get('/greeting/{name}', function ($name) {
    return ws_response('Hello '.$name)->header('Content-Type', 'text/plain');
});
```

Registration follows the Laravel 12.x routing API: HTTP verbs, groups, names, constraints, and controller actions. Refer to [Laravel's routing documentation](https://laravel.com/docs/12.x/routing) for those APIs. Use the `WpStarter` namespace in place of `Illuminate` and helpers such as `ws_route()`.

**The supplied skeleton does not add an `/api` prefix.** Its `routes/api.php` example explicitly registers `/api/me`. To apply a prefix to the entire file, add `->prefix('api')` to its group in `RouteServiceProvider` and remove `/api` from each route declaration.

Ordinary responses take over the request. Returning a string, JSON, redirect, or `ws_view()` sends a response and stops WordPress before the theme renders. Returning a WordPress response changes that behavior; see [controller responses](./controllers.md#return-values).

WordPress query functions such as `is_singular()` and `get_post()` are not ready at the normal URL dispatch point. Use shortcode routes when your controller needs the queried page, or explicitly defer a URL route to a later hook.

## WordPress shortcode routes {#wordpress-routes}

A shortcode route uses a tag, without brackets or a leading slash, as its route identifier:

```php
// routes/wp.php
use App\Http\Controllers\WelcomeController;
use WpStarter\Wordpress\Facades\Route;

Route::get('welcome-shortcode', [WelcomeController::class, 'shortcode']);
Route::post('welcome-shortcode', [WelcomeController::class, 'post']);
```

Create a WordPress page and put `[welcome-shortcode]` in its stored post content. Visiting that page runs the GET action, even if its slug or permalink changes. The skeleton's `/welcome` example creates a demo page called `welcome-shortcode-page`; production pages can be created through WordPress instead.

Matching requires all of the following:

1. WordPress considers the request singular (`is_singular()`).
2. `get_post()` returns the queried post.
3. Its `post_content` contains the route's shortcode tag.
4. The request method, domain, and scheme satisfy the route's constraints.

The router inspects stored content. A shortcode inserted only by a template, widget, or later content filter does not make a route match. Archive pages do not match this router. `{id}` placeholders and path prefixes are URL routing concepts; use a literal shortcode tag here.

This is **one controller dispatch for the request**, not one invocation per shortcode occurrence. When a page contains multiple routable tags, the first matching route in the collection wins. Another shortcode route is not dispatched after the first returns `ws_pass()`. Use ordinary shortcode components for independent, repeated blocks; see [shortcode rendering](./views.md#registered-shortcodes).

`shortcode_view()` is usually the right response for replacing the matched shortcode while keeping the theme. `content_view()` replaces content through `the_content`; `wp_view()` takes over the entire page. Merely declaring a shortcode route does not register a WordPress rendering callback for that tag.

## Shortcode attributes {#shortcode-attributes}

Given this stored content:

```text
[catalog category="books" limit="12"]
```

the matched route receives `category` and `limit` as route parameters. Read them by name from the request:

```php
// routes/wp.php
use WpStarter\Http\Request;
use WpStarter\Wordpress\Facades\Route;

Route::get('catalog', function (Request $request) {
    $category = $request->route('category', 'all');
    $limit = (int) $request->route('limit', 12);

    return shortcode_view('catalog.index', compact('category', 'limit'));
});
```

The router uses `shortcode_parse_atts()` on the **first regex match** for the tag. Named attributes are route parameters, positional attributes have numeric keys, and enclosed shortcode content is not injected. Repeated occurrences do not produce separate attribute sets for the controller. Missing attributes are not added automatically; use defaults and validation in your action.

Controller and closure scalar arguments are passed **positionally**, in parsed attribute order, after class dependencies are inserted. Argument names alone do not bind a scalar to the attribute with that name. A signature such as `show($category, $limit)` is fragile if an editor reorders attributes. Prefer `Request $request` and `$request->route('category')` for named access. See [controller inputs](./controllers.md#controller-parameters).

## Forms and HTTP methods {#forms-and-http-methods}

POST a form to the WordPress page's current permalink so the same shortcode route can match on submission. Query parameters and form fields are request input, not shortcode attributes.

```blade
{{-- resources/views/catalog/index.blade.php --}}
<form method="POST" action="{{ get_permalink() }}">
    @csrf
    <label for="query">Search</label>
    <input id="query" name="query" value="{{ ws_old('query') }}">
    <button type="submit">Search</button>
</form>
```

```php
Route::post('catalog', function (\WpStarter\Http\Request $request) {
    $data = $request->validate(['query' => 'required|string']);
    // Process the validated query here.

    return ws_redirect()->back()->withInput();
});
```

The skeleton assigns `web` middleware to shortcode routes, including sessions and CSRF verification. Include `@csrf` in forms; a WordPress nonce alone does not satisfy this middleware. For `PUT`, `PATCH`, or `DELETE`, register the corresponding route and use `@method(...)` in the POST form. An existing shortcode route with the wrong HTTP method can produce a 405 response rather than falling through to the theme.

## Middleware and bindings {#middleware-and-bindings}

The WordPress kernel copies the HTTP kernel's middleware aliases, groups, and priority list into the shortcode router. Attach middleware using the usual route API:

```php
Route::get('catalog', [\App\Http\Controllers\CatalogController::class, 'show'])
    ->middleware('auth');
```

The supplied `web` group includes `SubstituteBindings`, so shortcode attributes become available to binding middleware. This does not automatically turn an attribute into a `WP_Post`. Read an ID by name and call `get_post($id)`, or define your own binding for the relevant router. A class type hint asks the container for an object; it is not an instruction to fetch the current WordPress post.

## Dispatch at a WordPress hook {#dispatch-at-a-wordpress-hook}

WpStarter adds `hook($hook, $priority)` to **URL routes**. It registers a dispatch callback for the hook and restricts matching to that hook's priority:

```php
// routes/web.php
use WpStarter\Support\Facades\Route;

Route::get('/custom-page', function () {
    return wp_view('custom.page');
})->hook('template_redirect', 5);
```

Use a hook that has not already fired when routes are booted. The default URL dispatch remains `init:1`; the hook-restricted route waits for its own callback. Choose a nonzero priority in this implementation.

Do not rely on `hook()` to reschedule shortcode routes. Their validator list does not include `HookValidator`, and `WordpressStarter` only collects extra dispatch hooks from the URL router. Shortcode routing runs at the WordPress kernel's `$wpHandleHook`, defaulting to `['template_redirect', 1]`.

`wp_view(...)->on(...)` controls **when a returned page is sent**. It does not defer the controller itself. See [lifecycle and hooks](./lifecycle.md).

## Admin routes {#admin-routes}

Admin routes register WordPress menus and dispatch against their screen IDs. They have their own kernel and response rules. See [admin menus, controllers, and forms](./admin.md) for a complete example.
