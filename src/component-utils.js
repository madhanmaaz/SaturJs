const errStore = require("./errStore")
const helpers = require("./helpers")


function escapeHTML(str) {
    const escapeChars = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }

    return String(str).replace(/[&<>"']/g, char => escapeChars[char])
}

function isArray(data) {
    if (typeof data === "object" && Array.isArray(data)) return true
}

function isObject(data) {
    if (typeof data === "object" && !Array.isArray(data)) return true
}

// thisArgs
function esc2Uni(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\//g, '\\u002f')
}

function formatLoop(data) {
    if (isArray(data)) {
        return Object.entries(data).map(e => {
            e[0] = parseInt(e[0])
            return e
        })
    } else if (isObject(data)) {
        return Object.entries(data)
    } else {
        throw new TypeError(`array or object required.`)
    }
}

function display(value) {
    if (typeof value === "object") {
        return JSON.stringify(value)
    }

    return value
}

function displayX(value) {
    // Return an empty string if the value is null, undefined or false.
    if (value == null || value === false) return ''

    if (typeof value === "object") {
        // component data
        if (value.__SATUR_COMPONENT__ === true) {
            return value.html
        }

        return escapeHTML(JSON.stringify(value))
    }

    return escapeHTML(value)
}

function createContextKey(ctxStore, props, settings) {
    const componentName = settings.name
    if (!ctxStore[componentName]) {
        ctxStore[componentName] = {}
    }

    const componentLength = Object.keys(ctxStore[componentName]).length
    const ctxKey = componentLength === 0
        ? componentName
        : `${componentName}_${componentLength}`
    ctxStore[componentName][ctxKey] = props
    return ctxKey
}

function throwRenderError(template, output, settings) {
    const errorObj = new errStore.TemplateRenderError(`${output.error.message}\nFILE: ${settings.src}\n${helpers.createErrorSnippet(atob(template), output.l)}\n`)
    errorObj.name = output.error.name in errStore ? output.error.name : errorObj.name
    throw errorObj
}

function checkProps(types = {}, props, settings) {
    for (const key in types) {
        if (!props.hasOwnProperty(key)) {
            console.warn(`[FILE] ${settings.src}
    - The property '${key}' is not defined. Ensure it is passed as a prop.`)
            props[key] = ''
            continue
        }

        const funcName = types[key].name.toLowerCase()
        const actualType = typeof props[key]
        const expectedType = funcName === "array" ? "object" : funcName
        if (actualType !== expectedType) {
            console.warn(`[FILE] ${settings.src}
    - Property '${key}' expects type '${expectedType}', but received type '${actualType}'.`)
        }
    }
}

function hooksDataCollector(clientCalback, props, settings) {
    const store = { ...props }

    clientCalback(...[
        function defProps(types) {
            checkProps(types, props, settings)
            return props
        },
        function defProxy(data) {
            Object.assign(store, data)
        },
        function defMethods(methods) {
            Object.assign(store, methods)
        },
        function defEvents() { },
        function defWatch() { },
        function defLoad() { },
        function defError() { },
        function useSignal() { }
    ])

    return store
}


module.exports = {
    thisArgs: {
        display,
        displayX,
        formatLoop,
        esc2Uni
    },
    createContextKey,
    checkProps,
    throwRenderError,
    hooksDataCollector,
}