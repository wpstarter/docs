# Installation

- [Meet WpStarter](#meet-wp-starter)
    - [Why WpStarter?](#why-wp-starter)
- [Your First Laravel Project](#your-first-laravel-project)
    - [Installation Via Composer](#installation-via-composer)
- [Initial Configuration](#initial-configuration)
    - [Environment Based Configuration](#environment-based-configuration)
- [Next Steps](#next-steps)

<a name="meet-wp-starter"></a>
## Meet WpStarter

WpStarter is a Laravel port which integrated with WordPress. Provides Laravel syntax for developing WordPress application.

WpStarter strives to provide an amazing developer experience, all powerful of Laravel are ready in your WordPress application.



<a name="why-wp-starter"></a>
### Why WpStarter?

There are a variety of tools and frameworks available to you when building a web application. 
We keep all Laravel stuffs and integrate them with WordPress like Eloquent using $wpdb, Laravel Mail send via wp_mail,...
All Laravel classes available under `WpStarter` namespace, all Laravel helpers available under `ws_` prefix

<a name="your-first-wp-starter-project"></a>
## Your First WpStarter Project

WpStarter can be installed as a WordPress plugin

<a name="installation-via-composer"></a>
### Installation Via Composer

If your computer doesn't have Composer installed get it at https://getcomposer.org/ first.
Then you may create WpStarter project with composer. After the application has been created, you may copy it to `plugins` folder and activate it

    composer create-project "wpstarter/wpstarter:^1.*" example-plugin

### Installation within WordPress root directory

WpStarter can be placed outside `plugins` directory. It's highly recommend to put it inside WordPress root and load it via a `mu-plugin`.
It's more convenient as we don't have to open many nested directories see our app, also easier when run command line. Just `cd example-plugin` instead of `cd wp-content/plugins/example-plugin`

You can move WpStarter to WordPress's root directory by create a mu plugin `wp-content/mu-plugins/example-plugin.php` and require WpStarter's `main.php`
```php
<?php
/**
 * Plugin name: My Example Plugin
 */
require ABSPATH.'/example-plugin/main.php';

```




<a name="initial-configuration"></a>
## Initial Configuration

All of the configuration files for the WpStarter framework are stored in the `config` directory. Each option is documented, so feel free to look through the files and get familiar with the options available to you.

WpStarter needs almost no additional configuration out of the box. You are free to get started developing! However, you may wish to review the `config/app.php` file and its documentation. It contains several options such as `timezone` and `locale` that you may wish to change according to your application.

<a name="environment-based-configuration"></a>
### Environment Based Configuration

Since many of WpStarter's configuration option values may vary depending on whether your application is running on your local computer or on a production web server, many important configuration values are defined using the `.env` file that exists at the root of your application.

Your `.env` file should not be committed to your application's source control, since each developer / server using your application could require a different environment configuration. Furthermore, this would be a security risk in the event an intruder gains access to your source control repository, since any sensitive credentials would get exposed.

> {tip} For more information about the `.env` file and environment based configuration, check out the full [configuration documentation](/docs/{{version}}/configuration#environment-configuration).


<a name="next-steps"></a>
## Next Steps

Now that you have created your WpStarter project, you may be wondering what to learn next. First, we strongly recommend becoming familiar with how Laravel works by reading the following documentation:

<div class="content-list" markdown="1">

- [Request Lifecycle](/docs/{{version}}/lifecycle)
- [Configuration](/docs/{{version}}/configuration)
- [Directory Structure](/docs/{{version}}/structure)
- [Service Container](/docs/{{version}}/container)
- [Facades](/docs/{{version}}/facades)

</div>




