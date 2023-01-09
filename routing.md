# Routing

- [Basic Routing](#basic-routing)
- [WordPress Routes](#wordpress-routes)
- [Admin Routes](#admin-routes)


<a name="basic-routing"></a>
## Basic Routing

WpStarter routes work exactly like what Laravel routes does

    use WpStarter\Support\Facades\Route;

    Route::get('/greeting', function () {
        return 'Hello World';
    });

<a name="the-default-route-files"></a>
#### The Default Route Files

All WpStarter routes are defined in your route files, which are located in the `routes` directory. These files are automatically loaded by your application's `App\Providers\RouteServiceProvider`. The `routes/web.php` file defines routes that are for your web interface. These routes are assigned the `web` middleware group, which provides features like session state and CSRF protection. The routes in `routes/api.php` are stateless and are assigned the `api` middleware group.

For most applications, you will begin by defining routes in your `routes/web.php` file. The routes defined in `routes/web.php` may be accessed by entering the defined route's URL in your browser. For example, you may access the following route by navigating to `http://example.com/user` in your browser:

    use App\Http\Controllers\UserController;

    Route::get('/user', [UserController::class, 'index']);

Routes defined in the `routes/api.php` file are nested within a route group by the `RouteServiceProvider`. Within this group, the `/api` URI prefix is automatically applied so you do not need to manually apply it to every route in the file. You may modify the prefix and other route group options by modifying your `RouteServiceProvider` class.

<a name="available-router-methods"></a>
#### Available Router Methods

The router allows you to register routes that respond to any HTTP verb:

    Route::get($uri, $callback);
    Route::post($uri, $callback);
    Route::put($uri, $callback);
    Route::patch($uri, $callback);
    Route::delete($uri, $callback);
    Route::options($uri, $callback);

Sometimes you may need to register a route that responds to multiple HTTP verbs. You may do so using the `match` method. Or, you may even register a route that responds to all HTTP verbs using the `any` method:

    Route::match(['get', 'post'], '/', function () {
        //
    });

    Route::any('/', function () {
        //
    });

> {tip} When defining multiple routes that share the same URI, routes using the `get`, `post`, `put`, `patch`, `delete`, and `options` methods should be defined before routes using the `any`, `match`, and `redirect` methods. This ensures the incoming request is matched with the correct route.

<a name="dependency-injection"></a>
#### Dependency Injection

You may type-hint any dependencies required by your route in your route's callback signature. The declared dependencies will automatically be resolved and injected into the callback by the Laravel [service container](/docs/{{version}}/container). For example, you may type-hint the `Illuminate\Http\Request` class to have the current HTTP request automatically injected into your route callback:

    use WpStarter\Http\Request;

    Route::get('/users', function (Request $request) {
        // ...
    });

<a name="csrf-protection"></a>
#### CSRF Protection

Remember, any HTML forms pointing to `POST`, `PUT`, `PATCH`, or `DELETE` routes that are defined in the `web` routes file should include a CSRF token field. Otherwise, the request will be rejected. You can read more about CSRF protection in the [CSRF documentation](/docs/{{version}}/csrf):

    <form method="POST" action="/profile">
        @csrf
        ...
    </form>

<a name="wordpress-routes"></a>
## WordPress Routes

Laravel routes using path and that is not enough in WordPress as the path may be changed when we update slug. WpStarter achieves this by shortcode routing, that mean we match the request by a shortcode in page not by a path.

    use WpStarter\Wordpress\Facades\Route;

    Route::get('woocommerce_cart',function(){
        //.. This will run on woocommercer_cart page doesn't matter if it is /cart or /cart-vi
    })

You may define WordPress routes in `routes/wp.php`

<a name="admin-routes"></a>
## Admin Routes
    
WordPress has admin panel and WpStarter also provide Admin module out of the box. You can define new menu in WordPress Admin in `Admin/routes/admin.php`

    use WpStarter\Wordpress\Admin\Facades\Route;

    Route::add('ws-admin-sample', SampleAdminController::class);

### Menu attributes

You can set some more attributes like menu title, page title, menu position or capability by chaining `title` `pageTitle` `position` `capability` 

    Route::add('ws-admin-sample', SampleAdminController::class)
        ->title('Manage samples')
        ->pageTitle('Sample Admin Page')
        ->position(2)
        ->capability('edit_posts');

### Controller methods
We map url to controller method by query param `action` or `action2`

Dispatch method  will be {requestMethod}_{action} in camel case e.g. `/wp-admin/admin.php?page=ws-admin-sample&action=foo-bar` will call method `getFooBar` or `postFooBar`

Default action is `index`, if you do not pass any action `getIndex` and `postIndex` will be called. 

