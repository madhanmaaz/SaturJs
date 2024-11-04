<p align="center">
<img src="./saturjs_logo.webp" width="200" height="200">
</p>
<h1 align="center">SaturJs</h1>

<p align="center">
  <a href="https://saturjs.netlify.app/">
    <strong>Simple, Fast, And Easy To Learn.</strong><br>
    <b>Visit Website</b>
  </a>
</p>

<p align="center">
  <a href="https://github.com/madhanmaaz/saturjs-quick-start">Quick Start</a> |
  <a href="https://github.com/madhanmaaz/saturjs-examples">Examples</a>
</p>

![npm version](https://img.shields.io/npm/v/saturjs) ![license](https://img.shields.io/github/license/madhanmaaz/saturjs) ![issues](https://img.shields.io/github/issues/madhanmaaz/saturjs)


## 🚀 Overview

SaturJs is a lightweight, server-side rendering (SSR) library designed for building dynamic, fast-loading web applications with ease. It empowers developers to manage application state, handle components, and optimize rendering while maintaining full control over their architecture.

## ✨ Features

- **🖥️ Server-Side Rendering (SSR)**: Pre-render HTML on the server for improved performance and SEO.
- **🔄 Reactive State Management**: Utilize a simple proxy-based state system to track and react to data changes.
- **🧩 Component-based Architecture**: Organize your UI with reusable, modular components.
- **⚡ Efficient DOM Updates**: Built-in DOM diffing algorithm for optimized rendering.

## 📦 Quick Start

```bash
# Clone the starter template
git clone https://github.com/madhanmaaz/saturjs-quick-start
cd saturjs-quick-start

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🚀 Here’s a simple example to get you started:

```javascript
// server.js
const { setup, Router, renderPage } = require("saturjs")
const router = Router()

router.get("/", renderPage("index"))

module.exports = setup({
    appRouter: router
})
```

### Creating a Page View: `src/index.html`
```html
<script server>
    // server code
    const title = "page title"

    async function defServer(req, res, next) {

        if(req.query.id == "2") {
            res.send("user not found.")
        }

        return {
            id: req.query.id
        }
    }
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>{{ title }}</title>
</head>
<body>
    <h1>Welcome to SaturJs</h1>
    <p>User ID: {{ id }}</p>

    <!-- import component & render component -->
    <import src="./Counter.html" />
    {{ $$.Counter() }}
</body>
</html>
```

### Creating a Component
- You can create a component using the following structure: `src/Counter.html` the component must starts with caps.

```html
<template>
    <button onclick="handler">Count {{ count }}</button>
</template>

<script>
    const state = defProxy({
        count: 0
    })

    defEvents({
        handler() {
            state.count++
        }
    })
</script>
```

### 🧩 Template Syntax
```html
<!-- Basic Expressions -->
{{ 1 + 1 }}             <!-- Outputs: 2 -->
{{ username }}          <!-- Variable interpolation -->
{{- html }}             <!-- Unescaped HTML -->
{{# comments }}         <!-- Not visible in output -->

<!-- Conditionals -->
{{ if(condition) }}
    <p>True branch</p>
{{ else if(otherCondition) }}
    <p>Else if branch</p>
{{ else }}
    <p>Else branch</p>
{{/}}

<!-- Loops array -->
{{ for(value, index in array) }}
    <p>{{ index }}: {{ value }}</p>
{{/}}

<!-- Loops object -->
{{ for(value, key in object) }}
<p>{{ key }} - {{ value }}</p>
{{/}}

<!-- Component Usage -->
{{ $$.Counter({ count: 0 }) }}
{{ $$["Counter"]({ count: 0 }) }}
```

### 📘 Component Structure

```html
<template>
    <!-- Root element for the component; must contain only one root element -->
    <div>
        <!-- Component-specific event -->
        <button onclick="handler">Count {{ count }}</button>

        <!-- Access events from another component -->
        <button onclick="Settings.open">Open Settings</button>

        <!-- Pass arguments to a method -->
        <button onclick="deleteNotes(id, 1, 2)">Delete Notes</button>
    </div>
</template>

<script>
    // Import libraries; these will automatically be bundled
    const uuid = require("uuid");
    const axios = require("axios");

    // Define props that come from a parent component
    const props = defProps({
        title: String
    });

    // `defProxy` manages the state for this component.
    // It stores all data relevant to this component.
    const state = defProxy({
        count: 0,
        data: [],
        users: []
    });

    // `defEvents` defines component-specific events.
    // Events can be accessed from other components using `thisComponent.eventName`.
    defEvents({
        handler() {
            state.count++;
        },
        openPanel() {
            // Use `useSignal` to communicate with other components
            useSignal("Panel").open = true;
        }
    });

    // `defMethods` defines functions accessible within the template.
    defMethods({
        alter(value) {
            return `${value}.`;
        }
    });

    // `defWatch` monitors state changes; triggers when `count` changes
    defWatch({
        count(newValue, oldValue) {
            console.log("Count changed from", oldValue, "to", newValue);
        }
    });

    // Alert outside of `defLoad` throw an error
    // alert("loaded"); // incorrect

    // `defLoad` runs when the component is ready in the client
    defLoad(() => {
        alert("Component loaded"); // correct usage
    });

    // `defError` handles errors within the component
    defError((error) => {
        console.log("Error encountered:", error);
    });
</script>

```