const { parse: parseHTML, NodeType } = require("node-html-parser")

const helpers = require("./helpers")

// Modifies event attributes in an HTML element to bind them to the SaturJS event system.
function eventAttributes(element) {
    // Exit if the element is null or not an actual HTML element
    if (element == null || element.nodeType !== NodeType.ELEMENT_NODE) return

    // Process only attributes starting with "on" (like onclick, onmouseover)
    for (const [key, value] of Object.entries(element.attributes)) {
        if (!key.startsWith("on")) continue
        let eventValue = value
        let args = null

        // Check if the event has arguments by looking for parentheses
        if (eventValue.endsWith(")")) {
            eventValue = value.slice(0, value.indexOf("(")) // Function name
            args = value.slice(value.indexOf("("))          // Arguments
            args = ',' + helpers.wrapDelimiter(`JSON.stringify([${args}])`)
        }

        // If the eventValue has a dot (.), another component event | self component event
        // App.handler() - this will call from another component
        // handler() - self component event
        eventValue = eventValue.includes(".")
            ? `Satur.$.${eventValue}.call(this,arguments[0]${args ? args : ''})`
            : `Satur.$.${helpers.wrapDelimiter("this.contextKey")}.${eventValue}.call(this,arguments[0]${args ? args : ''})`

        element.setAttribute(key, eventValue)
    }

    // Recursively process child elements to modify their event attributes as well
    element.childNodes.forEach(child => eventAttributes(child))
}

// List of void attributes (boolean attributes) that shouldn't have values in HTML
const __voidAttributes = [
    "checked", "disabled", "readonly", "required",
    "autofocus", "multiple", "selected", "hidden",
    "open", "ismap", "defer", "async", "novalidate",
    "formnovalidate", "allowfullscreen", "itemscope",
    "reversed", "autoplay", "controls", "loop", "muted", "default"
]

// Processes an HTML string to handle void attributes (attributes without values) and
function voidAttributes(html) {
    const element = parseHTML(html)

    __voidAttributes.forEach(value => {
        element.querySelectorAll(__voidAttributes.map(attr => `[${attr}]`).join(",")).forEach(element => {
            __voidAttributes.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    if (element.getAttribute(value) == "false") {
                        element.removeAttribute(value)
                    }
                }
            })
        })
    })

    return element.outerHTML
}

module.exports = {
    eventAttributes,
    voidAttributes
}