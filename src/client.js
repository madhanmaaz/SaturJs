const Satur = ((exports) => {
    exports.$ = {}
    exports.components = {}
    exports.blocks = {}

    const UPDATE_SYMBOL = Symbol("UPDATE")
    const contextCaches = {}
    const methodsStore = {}
    const watchStore = {}
    const beforeMountStore = {}
    const mountedStore = {}
    const beforeUnmountStore = {}
    const unmountedStore = {}
    const beforeUpdateStore = {}
    const updatedStore = {}

    const proxyManager = {
        store: {},
        set(componentName, contextKey, dataOptions) {
            const proxy = new Proxy(dataOptions, {
                set(target, key, value) {
                    const watchers = watchStore[contextKey] || {}
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

    function getElement(e) {
        return document.querySelector(`[element="${e}"]`)
    }

    const __ESCAPECHARS = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }

    function escapeHTML(str) {
        if (str == null) return ""
        return String(str).replace(/[&<>"']/g, char => __ESCAPECHARS[char])
    }

    function renderBlocks(blockName, args) {
        const func = exports.blocks[blockName]

        if (func) {
            return func.call({ escapeHTML, renderBlocks }, args)
        }

        return ''
    }

    function renderComponent(_, componentReference, props, _show) {
        const componentName = componentReference.split("/").pop()
        const contextCache = contextCaches[componentName]
        const contextKey = contextCache.keys[contextCache.count]
        contextCache.count++
        if (contextCache.keys.length == contextCache.count) contextCache.count = 0

        const beforeMount = beforeMountStore[contextKey]
        const mounted = mountedStore[contextKey]
        const beforeUnmount = beforeUnmountStore[contextKey]
        const unmounted = unmountedStore[contextKey]

        exports.serverStates[componentName][contextKey] = props

        const func = exports.components[componentName]
        const renderedHTML = func.call({
            contextKey,
            escapeHTML,
            renderComponent,
            renderBlocks,
            _show
        }, {
            ...proxyManager.get(contextKey),
            ...methodsStore[componentName],
            ...props
        })

        if (_show) {
            // call after beforeMount
            if (beforeMount.state) {
                beforeMount.state = false
                beforeMount.func()
            }

            // call after mount
            if (mounted.state) {
                mounted.state = false
                requestAnimationFrame(mounted.func)
            }

            // resetUnmount states
            beforeUnmount.state = true
            unmounted.state = true
        } else if (!mounted.state) {
            // call beforeUnmount
            if (beforeUnmount.state) {
                beforeUnmount.state = false
                beforeUnmount.func()
            }

            // call after unmount
            if (unmounted.state) {
                unmounted.state = false
                requestAnimationFrame(unmounted.func)
            }

            // resetMount states
            beforeMount.state = true
            mounted.state = true
        }

        return _show ? renderedHTML : ''
    }

    // alter void attributes
    const __voidAttributes = [
        "checked", "disabled", "readonly", "required", "autofocus", "multiple",
        "selected", "hidden", "open", "ismap", "defer", "async", "novalidate",
        "formnovalidate", "allowfullscreen", "itemscope", "reversed", "autoplay",
        "controls", "loop", "muted", "default"
    ]

    function voidAttributes(element) {
        if (element == null) return

        element.querySelectorAll(__voidAttributes.map(attr => `[${attr}]`).join(","))
            .forEach(ele => {
                __voidAttributes.forEach(attr => {
                    if (ele.hasAttribute(attr)) {
                        const v = ele.getAttribute(attr) == "true"
                        ele[attr] !== v && (ele[attr] = v)
                    }
                })
            })
    }

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
        console.log("Update:", contextKey);
        const beforeUpdateFunc = beforeUpdateStore[contextKey]
        const updatedFunc = updatedStore[contextKey]

        const func = exports.components[componentName]
        const renderedHTML = func.call({
            contextKey,
            escapeHTML,
            renderComponent,
            renderBlocks,
            _show: true
        }, {
            ...proxyManager.get(contextKey),
            ...methodsStore[componentName],
            ...exports.serverStates[componentName][contextKey]
        })

        const template = document.createElement("template")
        template.innerHTML = renderedHTML

        const currentElement = getElement(contextKey)
        const updatedElement = template.content.firstElementChild

        beforeUpdateFunc && beforeUpdateFunc()
        diffUpdate(currentElement, updatedElement)
        updatedFunc && updatedFunc()
        voidAttributes(currentElement)
    }

    // Simple Virtual DOM diffing and patching algorithm
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

            let oldIndex = 0;
            let newIndex = 0;

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
                oldIndex++;
            }
        }
    }

    // Component bindings
    function scriptBinders(componentName, contextKey, serverProps) {
        beforeMountStore[contextKey] = {
            state: true,
            func: () => { }
        }
        mountedStore[contextKey] = {
            state: true,
            func: () => { }
        }
        beforeUnmountStore[contextKey] = {
            state: true,
            func: () => { }
        }
        unmountedStore[contextKey] = {
            state: true,
            func: () => { }
        }

        return [
            // hooks APIs
            function useProxy(obj) {
                return proxyManager.set(componentName, contextKey, JSON.parse(JSON.stringify(obj)))
            },
            function useSignal(contextKey) {
                return createFuncProxy(proxyManager.get(contextKey))
            },
            function useWatch(watchers) {
                watchStore[contextKey] = watchers
            },
            function defProps() {
                return serverProps
            },
            function defEvents(events) {
                Object.keys(events).forEach(eventName => {
                    exports.$[contextKey][eventName] = function (e, args = []) {
                        events[eventName].call(this, e, ...args)
                    }
                })
            },
            function defMethods(methods) {
                methodsStore[componentName] = methods
            },

            // lifecycle methods
            function beforeMount(func) {
                beforeMountStore[contextKey].func = func
            },
            function mounted(func) {
                mountedStore[contextKey].func = func
            },
            function beforeUnmount(func) {
                beforeUnmountStore[contextKey].func = func
            },
            function unmounted(func) {
                unmountedStore[contextKey].func = func
            },
            function beforeUpdate(func) {
                beforeUpdateStore[contextKey] = func
            },
            function updated(func) {
                updatedStore[contextKey] = func
            }
        ]
    }

    // Main initialization
    function main() {
        // Initialize contextCaches with component keys
        for (const componentName in exports.serverStates) {
            contextCaches[componentName] = { count: 0, keys: Object.keys(exports.serverStates[componentName]) };
        }

        // Bind scripts and call callbacks for each contextKey
        for (const componentName in exports.serverStates) {
            const contextData = exports.serverStates[componentName]

            for (const contextKey in contextData) {
                exports.$[contextKey] = {}
                const callback = exports.callbacks[componentName]
                if (!callback) continue

                try {
                    callback(...scriptBinders(componentName, contextKey, contextData[contextKey]))
                } catch (error) {
                    console.error(`Error executing callback for [${componentName}:${contextKey}]`, error)
                }
            }
        }
    }

    window.addEventListener("DOMContentLoaded", main)

    // helpers
    exports.useSignal = function useSignal(contextKey) {
        return createFuncProxy(proxyManager.get(contextKey))
    }
    return exports
})({})