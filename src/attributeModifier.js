const { NodeType } = require("node-html-parser")
const helpers = require("./helpers")

const voidAttributes = [
    "checked", "disabled", "readonly", "required",
    "autofocus", "multiple", "selected", "hidden",
    "open", "ismap", "defer", "async", "novalidate",
    "formnovalidate", "allowfullscreen", "itemscope",
    "reversed", "autoplay", "controls", "loop", "muted", "default"
]

function transformEventValue(value) {
    let eventValue = value.trim()
    let args = ''

    // Check if the value contains function arguments
    if (eventValue.endsWith(')')) {
        const openParenIndex = eventValue.indexOf('(')
        if (openParenIndex !== -1) {
            const functionName = eventValue.slice(0, openParenIndex)
            const functionArgs = eventValue.slice(openParenIndex + 1, -1)
            eventValue = functionName
            if (functionArgs.trim()) {
                args = `,${helpers.wrapDelimiter(`JSON.stringify([${functionArgs}])`)}`
            }
        }
    }

    // Determine if the event value includes a context
    const hasContext = eventValue.includes('.')
    const contextKey = hasContext ? '' : helpers.wrapDelimiter('$ctxKey || `_?`')

    // Construct the final event value string
    return `Satur.$.${hasContext ? '' : `${contextKey}.`}${eventValue}.call(this,arguments[0]${args})`
}

function modifyAttributes(element) {
    if (element == null || element.nodeType !== NodeType.ELEMENT_NODE) return

    for (const [key, value] of Object.entries(element.attributes)) {
        // voidAttributes
        if (voidAttributes.includes(key)) {
            let value = element.attributes[key]
            if (value.trim().length == 0) value = true
            element.setAttribute(`${helpers.wrapDelimiter(`if(${value})`)}${key}${helpers.wrapDelimiter('/')}`, '')
            element.removeAttribute(key)
            continue
        }

        // listeners
        if (key.startsWith("on")) {
            element.setAttribute(key, transformEventValue(value))
            continue
        }
    }

    element.childNodes.forEach(child => modifyAttributes(child))
}

module.exports = {
    modifyAttributes
}