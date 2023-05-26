# Livewire

- [Install](#install)
- [Create a component](#create-a-component)
- [Include the component](#include-the-component)
- [Livewire docs](#livewire-docs)


<a name="install"></a>
## Install
Include the PHP.

    composer require wpstarter/livewire

Include the JavaScript for WordPress page layout

    use WpStarter\Wordpress\Facades\Livewire;
    ...
    
    Livewire::enqueue();

Include the JavaScript for full page layout

```html
...
    @livewireStyles
</head>
<body>
    ...
 
    @livewireScripts
</body>
</html>
```

<a name="create-a-component"></a>
## Create a component

Run the following command to generate a new Livewire component called `counter`.

    php artisan make:livewire counter

Running this command will generate the following two files:

- app/Http/Livewire/Counter.php
- resources/views/livewire/counter.blade.php

<a name="include-the-component"></a>
## Include the component

Think of Livewire components like Blade includes. You can insert <livewire:some-component /> anywhere in a Blade view and it will render.

```html
<!-- resources/views/welcome/shortcode.blade.php -->
<div>
    <h2>
        Shortcode view
    </h2>
    <div>
        <livewire:counter/>
    </div>
</div>
```
<a name="livewire-docs"></a>
## Livewire docs

Checkout the official [Laravel Livewire documentation](https://laravel-livewire.com/docs) to learn how to take your application to the next level with interactive Livewire components.
