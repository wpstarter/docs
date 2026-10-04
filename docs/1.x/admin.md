# Admin Menus, Controllers, and Forms

- [Enable the admin module](#enable-the-admin-module)
- [Register menus](#register-menus)
- [Controllers and actions](#controllers-and-actions)
- [Inputs and forms](#inputs-and-forms)
- [Admin responses](#admin-responses)
- [Middleware and capabilities](#middleware-and-capabilities)
- [Layouts and notices](#layouts-and-notices)
- [Screen options and existing post tables](#screen-options-and-existing-post-tables)

## Enable the admin module {#enable-the-admin-module}

The skeleton already includes `App\Admin\AdminServiceProvider` in `config/app.php`. It binds `WpStarter\Wordpress\Admin\Contracts\Kernel` to `App\Admin\Kernel`, loads `app/Admin/routes/admin.php` with the `admin` middleware group, and registers views under the `admin::` namespace.

The framework registers menus on `admin_menu` and dispatches controllers on `current_screen`. Matching compares the menu's hook suffix returned by WordPress with the current screen ID. Controllers execute before WordPress prints the admin page, allowing redirects and headers to be sent.

Use `WpStarter\Wordpress\Admin\Facades\Route` for menus. This is a separate router from frontend URL and shortcode routing.

## Register menus {#register-menus}

```php
// app/Admin/routes/admin.php
use App\Admin\Controllers\SampleAdminController;
use WpStarter\Wordpress\Admin\Facades\Route;

Route::add('ws-admin-sample', SampleAdminController::class)
    ->title('Samples')
    ->pageTitle('Manage Samples')
    ->capability('manage_options')
    ->iconUrl('dashicons-admin-generic')
    ->position(25)
    ->name('samples');
```

`Route::add()` registers GET and POST. Its slug identifies the WordPress menu, not an application URL path. The page is normally accessed through `wp-admin/admin.php?page=ws-admin-sample`.

| Method | Purpose / default |
| --- | --- |
| `title($text)` | Menu label; defaults to a headline derived from the slug |
| `pageTitle($text)` | Page title and initial layout heading; defaults to the menu label |
| `capability($name)` | Capability passed to WordPress; defaults to `read` |
| `iconUrl($icon)` | Top-level menu icon, including a Dashicons class |
| `position($number)` | Menu position passed to WordPress |
| `parent($slug)` | Register as a submenu of an existing menu |
| `hide()` | Register under an internal hidden parent; this is visibility, not authorization |
| `name($name)` | Name usable by `ws_admin_url()` |
| `middleware(...)` | Middleware for this menu's requests |

### Child menus

The skeleton demonstrates grouping child menus below a top-level menu:

```php
Route::add('ws-admin-sample', SampleAdminController::class)
    ->capability('manage_options')
    ->group(function () {
        Route::add('ws-admin-sample-child-1', SampleAdminController::class)
            ->title('Sample Details');
    });
```

The menu's `group()` supplies its slug as `parent` and carries its current capability into the child group. Set the parent's capability before creating the group.

To attach a submenu to an existing WordPress menu:

```php
Route::parent('options-general.php')
    ->group(function () {
        Route::add('sample-settings', SampleAdminController::class)
            ->capability('manage_options')
            ->title('Sample Settings');
    });
```

### Links and redirects

```php
$url = ws_admin_url('samples', ['action' => 'edit', 'id' => 42]);
$currentPageUrl = ws_admin_url(null, ['action' => 'index']);

return ws_redirect()->admin('samples', ['action' => 'index']);
```

`ws_admin_url()` accepts a registered route name or slug. With no slug it uses the current menu. It asks WordPress for the menu URL and appends the supplied query parameters; it does not inherit the current query string. Generate links after menu registration. `ws_admin_menu()` returns the current matched menu.

## Controllers and actions {#controllers-and-actions}

Extend `App\Admin\Controllers\Controller`, which adds validation to `WpStarter\Wordpress\Admin\Routing\Controller`. Register the class as the menu's action. Its `__invoke()` selects the actual method from the request.

The first nonempty `action` or `action2` value is used, except `-1`, which is ignored for WordPress bulk-action selectors. If neither supplies an action, the default is `index`. The method is the camel-case combination of the HTTP method and action:

| Request | Controller method |
| --- | --- |
| GET, no action | `getIndex()` |
| POST, no action | `postIndex()` |
| GET, `action=edit` | `getEdit()` |
| POST, `action=save` | `postSave()` |
| GET, `action=foo-bar` | `getFooBar()` |
| POST, `action=-1&action2=delete` | `postDelete()` |

The selector uses `$request->input()`, so the action may come from query parameters or form input. Implement the methods your UI exposes. A missing method produces an exception; there is no automatic fallback to `getIndex()` for an unknown action. Public methods matching this naming scheme should be treated as callable actions.

### Resource-style action names

Calling `$this->resource()` in the controller constructor adds these mappings:

| Method and action | Controller method |
| --- | --- |
| GET `index` / `create` / `show` / `edit` | `index` / `create` / `show` / `edit` |
| POST `store` | `store` |
| PUT or PATCH `update` | `update` |
| DELETE `destroy` | `destroy` |

Other actions retain the default method-name convention. `Route::add()` only allows GET and POST, so resource-style PUT, PATCH, and DELETE actions need a menu registered with those methods, for example `Route::match(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'sample-records', RecordsController::class)`. A spoofed form method still needs to be allowed by the menu route.

## Inputs and forms {#inputs-and-forms}

Admin methods support container injection, including `Request` and application services. Query and form values such as `id` or `name` are not injected into scalar arguments automatically. Read and validate them from the request.

This example follows the skeleton's form-and-redirect workflow while explicitly protecting the settings operation:

```php
// app/Admin/Controllers/SampleAdminController.php
namespace App\Admin\Controllers;

use WpStarter\Http\Request;
use WpStarter\Wordpress\Admin\Facades\Notice;

class SampleAdminController extends Controller
{
    public function getIndex()
    {
        return ws_view('admin::sample');
    }

    public function postSave(Request $request)
    {
        ws_abort_unless(current_user_can('manage_options'), 403);

        $data = $request->validate(['name' => 'required|string|max:100']);
        ws_setting(['sample.name' => $data['name']]);
        ws_setting()->save();

        Notice::success('Saved')->dismissible();

        return ws_redirect()->admin('samples');
    }
}
```

Register the menu with `->name('samples')->capability('manage_options')` as shown above, then create the form:

```blade
{{-- app/Admin/resources/views/sample.blade.php --}}
@extends('admin::layout')

@section('content')
    <form method="POST" action="{{ ws_admin_url('samples') }}">
        @csrf
        <input type="hidden" name="action" value="save">

        <label for="name">Name</label>
        <input id="name" type="text" name="name"
               value="{{ ws_old('name', ws_setting('sample.name', '')) }}">

        @error('name')
            <p class="description">{{ $message }}</p>
        @enderror

        <button class="button button-primary" type="submit">Save</button>
    </form>
@endsection
```

The supplied `admin` middleware group includes encrypted cookies, queued cookies, the WordPress session middleware, validation error sharing, and CSRF verification. Include `@csrf`; a WordPress nonce does not replace this token. Standard validation redirects and old input depend on these session middlewares. There is no `SubstituteBindings` middleware in the supplied admin group.

## Admin responses {#admin-responses}

Admin response handling differs from frontend response handling:

| Return value | Admin behavior |
| --- | --- |
| `ws_view('admin::sample', $data)` | Rendered into an admin response; headers are sent early, and content is printed by the WordPress menu callback inside the admin shell |
| Plain string | Wrapped as an admin HTML response and printed by the menu callback |
| `null` | Empty admin content; the WordPress shell continues |
| Array / explicit JSON response | Sent immediately; kernel terminates and execution exits |
| Redirect | Sent immediately; kernel terminates and execution exits |
| Ordinary `ws_response(...)` | Sent immediately; execution exits, bypassing the normal admin shell |
| `ws_pass()` | Kernel does not send it; WordPress continues and kernel termination is scheduled at shutdown |

Return `ws_view()` for a normal menu page and a redirect after saving. The admin router wraps a view or plain content in `WpStarter\Wordpress\Admin\Routing\Response`; it preserves explicit HTTP responses. Thus `ws_view(...)` and `ws_response(ws_view(...))` have different admin behavior.

Frontend response helpers such as `content_view()`, `shortcode_view()`, and `wp_view()` are not processed by the frontend response handler in the admin kernel. Use the admin view/layout workflow instead.

## Middleware and capabilities {#middleware-and-capabilities}

Admin middleware is configured in `App\Admin\Kernel`, independently of `App\Http\Kernel`. A frontend middleware alias is not automatically available to admin routes. Add its alias to the admin kernel or attach a middleware class directly.

Set an explicit capability for privileged menus. The default `read` capability is appropriate only for pages intended to be accessible to users with that capability. Hiding a menu does not enforce access control. Check the capability again in actions performing privileged changes.

**Current limitation:** the skeleton's controller middleware example uses `->only('postSave')`. For class-based menu registration, the outer routed method is `__invoke`. The standard controller dispatcher filters middleware against `__invoke`, before the admin controller chooses `postSave`. Therefore that `only('postSave')` middleware does not run in this implementation.

Attach middleware to the menu route, or use controller middleware without action filters and check the request method/action inside it. If using `only()` / `except()`, remember that the outer invocation is the method the dispatcher sees. Do not use the sample's method filter to protect saves until dispatch is corrected.

## Layouts and notices {#layouts-and-notices}

The application layout `app/Admin/resources/views/layout.blade.php` extends `wp.admin::layout`. Child views extend `admin::layout` and fill its `content` section. The framework layout supplies the WordPress `wrap`, heading, optional page action, subtitle, and queued notices.

Customize the current menu's layout in the action:

```php
use WpStarter\Wordpress\Admin\Facades\Layout;

Layout::title('Samples')
    ->subTitle('Manage sample records')
    ->action('Add New', ws_admin_url('samples', ['action' => 'create']));

return ws_view('admin::sample');
```

Implement `getCreate()` before linking to the create action. The layout is also available as `ws_admin_menu()->layout()`.

Notices use a session-backed store and are displayed and cleared by the framework layout:

```php
use WpStarter\Wordpress\Admin\Facades\Notice;

Notice::success('Saved');
Notice::error('Could not save');
ws_admin_notice()->warning('Review the settings');
ws_admin_notice('Saved', 'success')->dismissible();
```

Supported types are `success`, `error`, `warning`, and `info`. Enqueue a notice before redirecting; the next page using the layout displays it. A custom layout must render and clear the notices itself if it does not inherit the framework layout.

Notice bodies, subtitle text, and page-action text are rendered as HTML. Escape user-controlled values before placing them there, for example `Notice::success('Saved '.esc_html($name))`.

## Screen options and existing post tables {#screen-options-and-existing-post-tables}

The `ScreenOption` service registers which options the WordPress save filter accepts. Register it before the screen-option submission is processed, typically in an admin provider's `boot()`, and add the UI on the relevant screen.

```php
use WpStarter\Wordpress\Admin\Facades\ScreenOption;

ScreenOption::add('sample_per_page', function ($value) {
    return max(1, min(100, (int) $value));
});
```

In the page action, register the native WordPress control:

```php
add_screen_option('per_page', [
    'label' => 'Samples per page',
    'default' => 20,
    'option' => 'sample_per_page',
]);

$perPage = (int) get_user_meta(get_current_user_id(), 'sample_per_page', true);
$perPage = $perPage ?: 20;
```

`ScreenOption::add()` does not create the control, paginate data, or read a saved value. The service installs its save filter when WordPress checks `screen-options-nonce`; late registration inside a controller may miss that check.

To extend an existing post-type list screen, subclass `WpStarter\Wordpress\Admin\ListTable\AlterPostsListTable`, set its `$post_type`, and instantiate it from an admin provider. It registers the relevant WordPress hooks.

| Extension method | Purpose |
| --- | --- |
| `defineColumns($columns)` | Columns to display |
| `defineSortableColumns($columns)` | Sortable columns |
| `defineHiddenColumns()` / `getPrimaryColumn()` | Hidden and primary columns |
| `prepareRowData($post_id)` | Prepare state for a row |
| `render{StudlyColumnName}Column($object)` | Render a custom column after `prepareRowData()` sets `$this->object` |
| `getRowActions($actions, $post)` | Row actions |
| `renderFilters()` / `queryFilters($query_vars)` | Filter controls and query changes |
| `defineBulkActions($actions)` / `handleBulkActions($redirect_to, $action, $ids)` | Bulk actions |

This helper alters WordPress's existing post list; it does not build a custom database-record list table. Bulk actions still need operation-specific validation and capability checks.
