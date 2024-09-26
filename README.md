<h1 align="center">SaturJs</h1>
<p align="center">A cosmic-inspired web library for seamless server-side rendering and dynamic state management.</p>

<p align="center">
<img src="./saturjs_logo.webp" width="200" height="200">
</p>

<p align="center">
<a href="https://saturjs.netlify.app/">
Simple, Fast, And Easy To Learn.
<b>Visit Website</b></a>
</p>

## Overview
SaturJs is a lightweight, server-side rendering (SSR) framework designed for building dynamic, fast-loading web applications with ease. It enables you to manage application state, handle components, and optimize rendering, all while maintaining full control over your architecture.

## Features
- **Server-Side Rendering (SSR)**: Pre-render your HTML on the server to improve performance and SEO.
- **Reactive State Management**: Use a simple proxy-based state system to track and react to data changes in your components.
- **Component-based Architecture**: Organize your UI with reusable components and blocks.
- **Lifecycle Hooks**: Manage component lifecycle events like mounting, updating, and unmounting.
- **Efficient DOM Updates**: Built-in DOM diffing simple algorithm for efficient and optimized DOM updates.

## Installation

To get started with SaturJs, you can clone the repository and install the required dependencies.

```bash
npm install saturjs
```

#### Getting Started
To set up SaturJs, create a basic `express` app.
```js
const express = require("express")
const app = express()
const saturjs = require("saturjs")

saturjs.setup(app, {
    dev: true, // just change true in production.
    version: require("./package.json").version // version of your app.
})

app.get("/", (req, res) => {
    res.render("index")
})

app.listen(3000)
```

#### Creating Components
- You can create a component using the following structure: `Counter.html`

```html
<template>
    <button onclick="handler">Count {{ count }}</button>
</template>

<script>
    const state = useProxy({
        count: 0
    })

    defEvents({
        handler() {
            state.count++
        }
    })
</script>
```

#### Creating template: `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>

    <!-- add Counter component -->
    {{@ ./Counter() }}
</body>
</html>
```