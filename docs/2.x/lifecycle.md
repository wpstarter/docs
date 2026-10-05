# Request Lifecycle and Hooks

- [Bootstrap](#bootstrap)
- [Frontend dispatch](#frontend-dispatch)
- [Admin dispatch](#admin-dispatch)
- [Response timing](#response-timing)
- [Extension hooks](#extension-hooks)

## Bootstrap {#bootstrap}

WordPress loads `main.php`, which creates `WordpressStarter` unless WordPress is installing or another entrypoint has already defined `__WS_FILE__`. The starter creates the application and selects the HTTP or console kernel.

Its early bootstrap runs through `ws_loaded`, normally on `muplugins_loaded` or immediately if that action has already fired. Early bootstrap loads environment, configuration, exception handling, and facades. At `plugins_loaded:1`, the starter triggers `ws_boot`, bootstraps providers, then triggers `ws_booted`.

Providers can register WordPress callbacks during bootstrap. They should not assume that the main query or all plugins' later initialization is complete.

## Frontend dispatch {#frontend-dispatch}

1. After `ws_booted`, the starter registers frontend callbacks for `init:1` and any hooks requested by URL routes.
2. At a dispatch hook, the HTTP kernel captures the request, applies global middleware, and tries the URL router.
3. If the URL router reports no route match, the kernel registers a callback at `template_redirect:1`.
4. At that callback, the kernel reuses the captured request, applies its middleware pipeline, and tries the shortcode router against the queried WordPress post.
5. A matched response is processed according to its type. If no shortcode route matches, WordPress continues its normal template flow.

Both phases can execute global middleware for the same browser request. The shortcode phase rebinds the request in the container. Avoid assuming middleware side effects run only once.

An exception or a deliberate 404 from a matched URL route is an application response, not a request to continue with shortcode routing. A broad URL fallback route can also prevent the no-match handoff.

## Admin dispatch {#admin-dispatch}

For `is_admin()` requests, the starter skips frontend dispatch registration. The framework's admin service provider activates the bound admin kernel.

- `admin_menu:10`: register menus and store their WordPress hook suffixes.
- `current_screen:10`: dispatch the matching menu through the admin middleware pipeline.
- Menu callback: print stored admin view content inside WordPress's admin shell.
- `shutdown`: terminate the kernel for deferred admin content and pass-through responses.

Redirects and other explicit HTTP responses are sent during controller processing and exit early. An admin request that matches no registered menu is allowed to continue. This router handles menu screens; it does not automatically register WordPress REST or `admin-ajax.php` endpoints.

## Response timing {#response-timing}

`Kernel::handle($request, true)` enables production response processing. The default `handle($request)` returns a response for the caller instead; a unit/HTTP test that only inspects that return value does not prove WordPress output hooks or exit behavior.

For a WordPress frontend response, the response handler:

1. Boots response components.
2. Sends headers immediately.
3. Installs title filters.
4. Sends a full-page response, or registers content / shortcode callbacks for later rendering.

Full-page responses terminate and exit after sending. Content and shortcode responses register kernel termination on WordPress `shutdown`. Frontend `ws_pass()` currently has no equivalent termination registration; see the review notes for that implementation gap.

`wp_view(...)->on('hook', $priority)` schedules the body only when the hook has not fired. If it has already fired, sending happens immediately. This does not move the controller or middleware execution to the selected hook.

## Extension hooks {#extension-hooks}

| Hook | Arguments / purpose |
| --- | --- |
| `ws_loaded` | Starter instance; early bootstrap entry |
| `ws_boot` | Application and kernel, before provider bootstrap |
| `ws_booted` | Application and kernel, after provider bootstrap |
| `ws_register_scripts` | Resource manager, after queued script/style registration at `init` |

Register listeners early enough for the relevant hook. When normal URL actions need another plugin's `init` initialization, use a later URL route hook, such as `->hook('init', 11)`, rather than assuming the default `init:1` runs after that plugin.

Shortcode routes use the HTTP kernel's `$wpHandleHook` (`['template_redirect', 1]` by default). The URL route `hook()` API does not reschedule the shortcode router. See [routing hooks](./routing.md#dispatch-at-a-wordpress-hook).
