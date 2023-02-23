# Controllers

- [Introduction](#introduction)
- [Writing Controllers](#writing-controllers)
    - [Basic Controllers](#basic-controllers)
    - [Return Values](#return-values)
    - [Single Action Controllers](#single-action-controllers)
- [Controller Middleware](#controller-middleware)



<a name="introduction"></a>
## Introduction

Instead of defining all of your request handling logic as closures in your route files, you may wish to organize this behavior using "controller" classes. Controllers can group related request handling logic into a single class. For example, a `UserController` class might handle all incoming requests related to users, including showing, creating, updating, and deleting users. By default, controllers are stored in the `app/Http/Controllers` directory.

<a name="writing-controllers"></a>
## Writing Controllers

<a name="basic-controllers"></a>
### Basic Controllers

Let's take a look at an example of a basic controller. Note that the controller extends the base controller class included with Laravel: `App\Http\Controllers\Controller`:

    <?php

    namespace App\Http\Controllers;

    use App\Http\Controllers\Controller;
    use App\Models\User;

    class UserController extends Controller
    {
        /**
         * Show the profile for a given user.
         *
         * @param  int  $id
         * @return \Illuminate\View\View
         */
        public function show($id)
        {
            return ws_view('user.profile', [
                'user' => User::findOrFail($id)
            ]);
        }
    }

You can define a route to this controller method like so:

    use App\Http\Controllers\UserController;

    Route::get('/user/{id}', [UserController::class, 'show']);

When an incoming request matches the specified route URI, the `show` method on the `App\Http\Controllers\UserController` class will be invoked and the route parameters will be passed to the method.

> {tip} Controllers are not **required** to extend a base class. However, you will not have access to convenient features such as the `middleware` and `authorize` methods.

<a name="return-values"></a>
### Return Values

Normally controller will return view by using `ws_view`, besides `ws_view` WpStarter provides other views `wp_view`, `content_view` and `shortcode_view`

Return value    | Behavior               
----------------|---------------------------
`ws_view`       | Response will be sent on Kernel handle and stop the application
`array`         | PHP array will be converted to json response and sends on Kernel handle
`wp_view`       | Response will be sent on specified wp hook and stop the application 
`content_view`  | Overwrite WordPress post content 
`shortcode_view`| Add/overwite shortcodes on current request
`ws_pass`       | No response will be sent or content modified. Useful when you want to process some logic without response
 


<a name="single-action-controllers"></a>
### Single Action Controllers

If a controller action is particularly complex, you might find it convenient to dedicate an entire controller class to that single action. To accomplish this, you may define a single `__invoke` method within the controller:

    <?php

    namespace App\Http\Controllers;

    use App\Http\Controllers\Controller;
    use App\Models\User;

    class ProvisionServer extends Controller
    {
        /**
         * Provision a new web server.
         *
         * @return \Illuminate\Http\Response
         */
        public function __invoke()
        {
            // ...
        }
    }

When registering routes for single action controllers, you do not need to specify a controller method. Instead, you may simply pass the name of the controller to the router:

    use App\Http\Controllers\ProvisionServer;

    Route::post('/server', ProvisionServer::class);

You may generate an invokable controller by using the `--invokable` option of the `make:controller` Artisan command:

    php artisan make:controller ProvisionServer --invokable


<a name="controller-middleware"></a>
## Controller Middleware

[Middleware](/docs/{{version}}/middleware) may be assigned to the controller's routes in your route files:

    Route::get('profile', [UserController::class, 'show'])->middleware('auth');

Or, you may find it convenient to specify middleware within your controller's constructor. Using the `middleware` method within your controller's constructor, you can assign middleware to the controller's actions:

    class UserController extends Controller
    {
        /**
         * Instantiate a new controller instance.
         *
         * @return void
         */
        public function __construct()
        {
            $this->middleware('auth');
            $this->middleware('log')->only('index');
            $this->middleware('subscribed')->except('store');
        }
    }

Controllers also allow you to register middleware using a closure. This provides a convenient way to define an inline middleware for a single controller without defining an entire middleware class:

    $this->middleware(function ($request, $next) {
        return $next($request);
    });