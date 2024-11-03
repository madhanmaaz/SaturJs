const Satur = (function (exports) {
    const UPDATE_SYMBOL = Symbol("UPDATE")

    exports.$ = {}
    exports.pageProps = {}
    exports.components = {}
    exports.callbacks = {}
    exports.browserPackages = {}
    exports.contextCaches = {}

    const DefStore = {
        methods: {},
        watch: {},
        error: {}
    }

    function createFuncProxy(dataOptions) {
        return new Proxy((newValues, uiUpdate = true) => {
            dataOptions[UPDATE_SYMBOL] = { newValues, uiUpdate }
        }, {
            set(_, key, value) {
                dataOptions[key] = value
                return true
            },
            get(_, key) {
                return dataOptions[key]
            }
        })
    }

    const getElement = (() => {
        const cache = {}

        return (ctxKey) => {
            if (document.contains(cache[ctxKey])) {
                return cache[ctxKey]
            } else {
                cache[ctxKey] && delete cache[ctxKey]
            }

            if (!cache[ctxKey]) {
                cache[ctxKey] = document.querySelector(`[element="${ctxKey}"]`)
            }

            return cache[ctxKey]
        }
    })()

    const ProxyManager = {
        store: {},
        register(componentName, contextKey, data) {
            const proxy = new Proxy(data, {
                set(target, key, value) {
                    const watchers = DefStore.watch[contextKey] || {}
                    const watcher = {}
                    let uiUpdate = true

                    if (typeof key === "symbol" && key.description === "UPDATE") {
                        uiUpdate = value.uiUpdate
                        value = value.newValues

                        watcher.key = Object.keys(watchers).find(v => value[v])
                        watcher.old = target[watcher.key]
                        watcher.new = value[watcher.key]
                        watcher.func = watchers[watcher.key]

                        Object.assign(target, value)
                    } else {
                        watcher.key = key
                        watcher.old = target[key]
                        watcher.new = value
                        watcher.func = watchers[key]

                        target[key] = value
                    }

                    if (watcher.func) {
                        const newValue = watcher.func(watcher.old, watcher.new)
                        if (newValue) {
                            target[watcher.key] = newValue
                        }
                    }

                    uiUpdate && scheduleUpdate(componentName, contextKey)
                    return true
                }
            })

            this.store[contextKey] = proxy
            return createFuncProxy(proxy)
        },
        get(contextKey) {
            return this.store[contextKey]
        }
    }

    // ThisArgs
    const ThisArgs = {
        escapeHTML(str) {
            const escapeChars = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            }

            return String(str).replace(/[&<>"']/g, char => escapeChars[char])
        },
        display(value) {
            if (typeof value === "object") {
                return JSON.stringify(value)
            }

            return value
        },
        displayX(value) {
            // Return an empty string if the value is null, undefined or false.
            if (value == null || value === false) return ''

            if (typeof value === "object") {
                // component data
                if (value.__SATUR_COMPONENT__ === true) {
                    return value.html
                }

                return this.escapeHTML(JSON.stringify(value))
            }

            return this.escapeHTML(value)
        },
        formatLoop(data) {
            if (typeof data === "object" && Array.isArray(data)) {
                return Object.entries(data).map(e => {
                    e[0] = parseInt(e[0])
                    return e
                })
            } else if (typeof data === "object" && !Array.isArray(data)) {
                return Object.entries(data)
            } else {
                throw new TypeError(`array or object required.`)
            }
        },
        esc2Uni(value) {
            return JSON.stringify(value)
                .replace(/</g, '\\u003c')
                .replace(/>/g, '\\u003e')
                .replace(/\//g, '\\u002f')
        }
    }

    const renderComponent = new Proxy({}, {
        get(_, componentName) {
            return function (props) {
                const ctxCache = exports.contextCaches[componentName]
                let contextKey = ctxCache.keys[ctxCache.count]

                if (contextKey == null) {
                    contextKey = ctxCache.keys.length === 0
                        ? componentName
                        : `${componentName}_${ctxCache.keys.length}`

                    ctxCache.keys.push(contextKey)
                    exports.$[contextKey] = {}
                    exports.callbacks[componentName](...scriptBinders(
                        componentName,
                        contextKey,
                        props
                    ))
                }

                ctxCache.count++
                exports.pageProps[componentName][contextKey] = props
                const __template__ = exports.components[componentName]
                const errFunc = DefStore.error[contextKey]

                try {
                    const output = __template__.call(
                        ThisArgs,
                        {
                            ...props,
                            ...ProxyManager.get(contextKey),
                            ...DefStore.methods[contextKey],
                        },
                        renderComponent,
                        contextKey,
                        null,
                        false
                    )

                    if (typeof output === "string") {
                        return {
                            __SATUR_COMPONENT__: true,
                            html: output
                        }
                    }

                    if (typeof errFunc === "function") {
                        return errFunc(output.error)
                    } else {
                        throw output.error
                    }
                } catch (error) {
                    if (typeof errFunc === "function") {
                        return errFunc(error)
                    } else {
                        throw error
                    }
                }
            }
        }
    })

    // Batch DOM updates
    let pendingUpdates = []
    function scheduleUpdate(componentName, contextKey) {
        if (!pendingUpdates.some(u => u.contextKey === contextKey)) {
            pendingUpdates.push({ componentName, contextKey })
        }

        if (pendingUpdates.length === 1) {
            requestAnimationFrame(() => {
                pendingUpdates.forEach(({ componentName, contextKey }) => {
                    updateComponent(componentName, contextKey)
                })
                pendingUpdates = []
            })
        }
    }

    // update component
    function updateComponent(componentName, contextKey) {
        const errFunc = DefStore.error[contextKey]

        try {
            const __template__ = exports.components[componentName]
            const output = __template__.call(
                ThisArgs,
                {
                    ...exports.pageProps[componentName][contextKey],
                    ...ProxyManager.get(contextKey),
                    ...DefStore.methods[contextKey],
                },
                renderComponent,
                contextKey,
                null,
                false
            )

            if (typeof output === "object") {
                if (typeof errFunc === "function") {
                    return errFunc(output.error)
                } else {
                    throw error
                }
            }

            const template = document.createElement("template")
            template.innerHTML = output

            const currentElement = getElement(contextKey)
            const updatedElement = template.content.firstElementChild

            diffUpdate(currentElement, updatedElement)

            Object.keys(exports.contextCaches).forEach(componentName => {
                exports.contextCaches[componentName].count = 0
            })
        } catch (error) {
            if (typeof errFunc === "function") {
                errFunc(error)
            } else {
                throw error
            }
        }
    }

    //  diffUpdate
    function diffUpdate(oldNode, newNode) {
        if (!oldNode || !newNode) return
        if (oldNode.isEqualNode(newNode)) return

        // If the node types or tags are different, replace the old node with the new one
        if (oldNode.nodeType !== newNode.nodeType || oldNode.tagName !== newNode.tagName) {
            oldNode.replaceWith(newNode.cloneNode(true))
            return
        }

        // Update text nodes
        if (oldNode.nodeType === Node.TEXT_NODE && newNode.nodeType === Node.TEXT_NODE) {
            if (oldNode.nodeValue !== newNode.nodeValue) {
                oldNode.nodeValue = newNode.nodeValue
            }
        } else if (oldNode.nodeType === Node.ELEMENT_NODE && newNode.nodeType === Node.ELEMENT_NODE) {
            // Update value attributes for form inputs
            if (oldNode.tagName === 'INPUT' || oldNode.tagName === 'TEXTAREA') {
                if (oldNode.value !== newNode.value) {
                    oldNode.value = newNode.value
                }
            }

            // Update attributes
            const oldAttributes = oldNode.attributes
            const newAttributes = newNode.attributes

            for (let i = oldAttributes.length - 1; i >= 0; i--) {
                const attr = oldAttributes[i];
                if (!newNode.hasAttribute(attr.name)) {
                    oldNode.removeAttribute(attr.name)
                }
            }

            for (let i = newAttributes.length - 1; i >= 0; i--) {
                const attr = newAttributes[i]
                if (oldNode.getAttribute(attr.name) !== attr.value) {
                    oldNode.setAttribute(attr.name, attr.value)
                }
            }

            // Update child nodes
            const oldChildren = Array.from(oldNode.childNodes)
            const newChildren = Array.from(newNode.childNodes)

            let oldIndex = 0
            let newIndex = 0

            // Compare each child and update or replace as needed
            while (newIndex < newChildren.length) {
                if (!oldChildren[oldIndex]) {
                    oldNode.appendChild(newChildren[newIndex].cloneNode(true))
                    newIndex++
                } else if (!newChildren[newIndex]) {
                    oldNode.removeChild(oldChildren[oldIndex])
                    oldIndex++
                } else {
                    diffUpdate(oldChildren[oldIndex], newChildren[newIndex])
                    oldIndex++
                    newIndex++
                }
            }

            // Remove any leftover old children
            while (oldIndex < oldChildren.length) {
                oldNode.removeChild(oldChildren[oldIndex])
                oldIndex++
            }
        }
    }

    // Component bindings
    function scriptBinders(componentName, contextKey, props) {
        return [
            function defProps() {
                return props
            },
            function defProxy(data) {
                return ProxyManager.register(componentName, contextKey, JSON.parse(JSON.stringify(data)))
            },
            function defMethods(data) {
                DefStore.methods[contextKey] = data
            },
            function defEvents(events) {
                Object.keys(events).forEach(eventName => {
                    exports.$[contextKey][eventName] = function (e, args = []) {
                        events[eventName].call(this, e, ...args)
                    }
                })
            },
            function defWatch(data) {
                DefStore.watch[contextKey] = data
            },
            function defLoad(func) {
                func()
            },
            function defError(func) {
                DefStore.error[contextKey] = func
            },
            function useSignal(contextKey) {
                return createFuncProxy(ProxyManager.get(contextKey))
            }
        ]
    }

    function main() {
        // contexts
        Object.keys(exports.pageProps).forEach(componentName => {
            const keys = Object.keys(exports.pageProps[componentName])
            exports.contextCaches[componentName] = {
                count: keys.length,
                keys
            }
        })

        // no contexts
        Object.keys(exports.components).forEach(componentName => {
            if (exports.pageProps[componentName] == null) {
                exports.pageProps[componentName] = {}
                exports.contextCaches[componentName] = {
                    count: 0,
                    keys: []
                }
            }
        })

        // Bind scripts and call callbacks for each contextKey
        for (const componentName in exports.pageProps) {
            const ctxData = exports.pageProps[componentName]

            for (const contextKey in ctxData) {
                exports.$[contextKey] = {}
                const callback = exports.callbacks[componentName]
                if (!callback) continue

                try {
                    callback(...scriptBinders(componentName, contextKey, ctxData[contextKey]))
                } catch (error) {
                    console.error(`Error executing callback for [${componentName}:${contextKey}]`)
                    console.log(error)
                }
            }
        }
    }

    window.addEventListener("DOMContentLoaded", main)

    // helpers
    exports.defSignal = function useSignal(contextKey) {
        return createFuncProxy(ProxyManager.get(contextKey))
    }

    return exports
})({})