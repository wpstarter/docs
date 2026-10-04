# Controller Inputs and Responses

- [Controller classes](#introduction)
- [Controller parameters](#controller-parameters)
- [Return values and execution](#return-values)
- [Redirects and pass-through](#redirects-and-pass-through)
- [Middleware](#controller-middleware)

## Controller classes {#introduction}

Frontend controllers normally extend `App\Http\Controllers\Controller`. Register an explicit method or an invokable controller with the appropriate router:

```php
use App\Http\Controllers\CatalogController;
use WpStarter\Wordpress\Facades\Route;

Route::get('catalog', [CatalogController::class, 'show']);
```

For the general controller API, dependency injection, and invokable controllers, use [Laravel 8's controller documentation](https://laravel.com/docs/8.x/controllers), replacing `Illuminate` imports with `WpStarter`. This page covers WordPress input and response behavior. Admin controllers extend a different base class; see [admin controllers](./admin.md#controllers-and-actions).

## Controller parameters {#controller-parameters}

| Input | How to access it | Behavior |
| --- | --- | --- |
| Current HTTP request | Type-hint `WpStarter\Http\Request` | Injected from the container |
| Application service | Type-hint a concrete class or bound interface | Resolved by the container |
| URL placeholder | Scalar argument, or `$request->route('id')` | Available on URL routes with placeholders |
| Shortcode attribute | `$request->route('category', 'all')` | First matching tag's parsed attributes on a shortcode route |
| Query string | `$request->query('sort', 'title')` | Not automatically injected as scalar arguments |
| Form / JSON input | `$request->input('name')` or validation | Separate from route parameters |
| Current WordPress post | `get_post()` inside a shortcode action | WordPress query is ready at this dispatch point |
| Enclosed shortcode content | A registered shortcode component's `$content` | Not supplied to a shortcode route action |
| Admin `action`, IDs, filters | `$request->input(...)` | Admin input is described in the admin chapter |

Here is an action using named shortcode attributes and query input:

```php
namespace App\Http\Controllers;

use WpStarter\Http\Request;

class CatalogController extends Controller
{
    public function show(Request $request)
    {
        $attributes = [
            'category' => $request->route('category', 'all'),
            'limit' => $request->route('limit', 12),
        ];

        $validated = ws_validator($attributes, [
            'category' => 'required|string',
            'limit' => 'required|integer|min:1|max:100',
        ])->validate();

        return shortcode_view('catalog.index', [
            'category' => $validated['category'],
            'limit' => (int) $validated['limit'],
            'sort' => $request->query('sort', 'title'),
            'page' => get_post(),
        ]);
    }
}
```

`$request->validate(...)` validates request input; to validate shortcode attributes explicitly, pass route values to `ws_validator()` as above.

### Scalar injection is positional

For `[catalog category="books" limit="12"]`, an action `show(Request $request, $category, $limit)` receives the two values in that order. If the content becomes `[catalog limit="12" category="books"]`, the scalar values swap. Both closures and frontend controller actions use the same route dependency resolver and ultimately call the action with `array_values($parameters)`.

Scalar defaults are used when a positional value is absent. They do not map missing attribute names to the right argument. Named request access is the stable interface for editor-controlled content.

Do not type-hint `WP_Post` or `WP_User` expecting the framework to inject the currently queried post or logged-in user. Use WordPress functions, `$request->user()` for the configured guard, or an explicit application binding. URL actions normally execute before WordPress resolves the main query.

## Return values and execution {#return-values}

The following table describes production frontend handling through `Kernel::handle($request, true)`. Returning a value chooses whether WpStarter owns the response or lets WordPress continue rendering.

| Return value | Result | WordPress / termination behavior |
| --- | --- | --- |
| `ws_view('page', $data)` | Ordinary HTML response | Sent during kernel processing; kernel terminates and execution exits |
| String / ordinary `ws_response(...)` | Ordinary response | Sent immediately; execution exits |
| Array / JSON-serializable value | JSON response | Sent immediately; execution exits |
| `ws_response()->json(...)` | Explicit JSON response | Sent immediately; execution exits |
| `ws_redirect()->back()` or another redirect | Redirect response | Sent immediately; execution exits |
| `wp_view('page', $data)` | Full WordPress page response | Sends at its configured hook, or immediately if none is set or the hook has fired; then terminates and exits |
| `content_view('fragment', $data)` | Content response | Adds a `the_content` filter; theme continues; kernel terminates at WordPress `shutdown` |
| `shortcode_view('fragment', $data)` | Shortcode response | Registers / replaces shortcode callbacks for this request; theme continues; kernel terminates at `shutdown` |
| `ws_pass()` | Pass-through response | Sends headers and installs title filters, but no body or content replacement; WordPress continues |
| `null` / no return | Empty ordinary response | Sent immediately; execution exits; this is not pass-through |

The WordPress response handler sends headers **when it processes the response**, before delayed content rendering. Delaying a `wp_view()` body does not delay its headers. In the current implementation, frontend pass-through does not register the shutdown termination callback used by content and shortcode responses.

### Replace the matched shortcode

```php
return shortcode_view('catalog.index', ['items' => $items]);
```

On a shortcode route, the default tag is the matched route's identifier (`catalog`). On a URL route, it defaults to `ws_content`. Set an explicit tag with the fourth argument:

```php
return shortcode_view('catalog.index', ['items' => $items], [], 'catalog');
```

Add more replacements to the same response:

```php
return shortcode_view('catalog.index', ['items' => $items])
    ->add('catalog-summary', 'catalog.summary', ['count' => count($items)]);
```

The callback registered by this response renders the prepared view. It does not receive each occurrence's attributes or enclosed content. Repeated tags therefore share the prepared data. Use a [registered shortcode component](./views.md#registered-shortcodes) when each occurrence needs its own input.

### Replace content inside the theme

```php
return content_view('catalog.index', ['items' => $items])
    ->withPostTitle('Catalog')
    ->withTitle('Catalog');
```

This adds a `the_content` filter; it does not update `post_content` in the database. The implementation does not restrict the filter to the main loop or queried post, so it can also affect secondary content rendered during the request. An empty rendered buffer preserves the incoming content instead of clearing it.

`withPostTitle()` filters `the_title`; `withTitle()` modifies the `title` part of `document_title_parts`. `withDocumentTitle()` filters `document_title`. These filters also apply for the request without a post-ID guard; theme support determines which title hooks are used.

### Take over the full page

```php
return wp_view('catalog.page', ['items' => $items]);
```

The view must supply the complete page layout. It does not automatically include the active theme's header or footer. A URL controller can ask to send it later:

```php
return wp_view('catalog.page', ['items' => $items])
    ->onTemplateRedirect(10);
```

Other methods are `onWpLoaded($priority)`, `onWp($priority)`, and `on($hook, $priority)`. If the selected hook has already fired, the response is sent immediately; it does not wait for another occurrence of that hook. See [views and theme integration](./views.md) for layouts and assets.

## Redirects and pass-through {#redirects-and-pass-through}

For a form submission, validate and redirect back using the session-enabled `web` group:

```php
public function submit(\WpStarter\Http\Request $request)
{
    $data = $request->validate(['name' => 'required|string']);
    // Persist the validated data here.

    return ws_redirect()->back()->withInput();
}
```

Use pass-through when the controller performs work and should let the current WordPress rendering continue:

```php
public function prepare()
{
    ws_enqueue_css('catalog', ws_asset('css/catalog.css'));

    return ws_pass();
}
```

Pass-through does not ask the router to try its next route. If the matched shortcode should remain visible, it needs a rendering callback registered elsewhere.

## Middleware {#controller-middleware}

Frontend controller middleware follows the usual controller API, including `only()` and `except()` for explicitly routed methods. Route middleware can also return any response in the table above and short-circuit the controller.

Admin controllers registered as a class dispatch through `__invoke`, then choose a method from the request. Their method-specific middleware has a limitation in this version; use the [admin middleware guidance](./admin.md#middleware-and-capabilities).
