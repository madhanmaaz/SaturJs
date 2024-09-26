const { parse: parseHTML } = require("node-html-parser")
const errStore = require("./errStore")
const config = require("./config")
const path = require("path")
const fs = require("fs")

// Finds a component by resolving its file path relative to the parent file.
function findComponent(parentFilePath, componentReference) {
    const componentName = path.basename(componentReference)
    let componentPath = path.resolve(path.dirname(parentFilePath), componentReference)
    componentPath = `${componentPath}.${config.ext}`

    // Check if the component file exists, if not, throw an error
    if (!fs.existsSync(componentPath)) {
        throw new errStore.ComponentNotFound(`The component with reference '${componentReference}' could not be found.`)
    }

    return {
        componentName,
        componentPath
    }
}

// Loads a component from its file path and extracts its template, 
// script, and styles.
function loadComponent(componentPath, componentName) {
    const htmlRawData = fs.readFileSync(componentPath, "utf-8")
    const document = parseHTML(htmlRawData)

    const template = document.querySelector("template")
    const script = document.querySelector("script")
    const styles = document.querySelector("style")

    if (template == null) {
        throw new errStore.TemplateElementNotFound(`The <template> element (...)</template> could not be found in the '${componentName}' component.`)
    }

    const firstElement = template.querySelector(":first-child")
    if (firstElement == null) {
        throw new errStore.ChildLimitError(`The '${componentName}' component's template must include at least one child element. Found 0 instead.`)
    }

    return {
        template: firstElement,
        rawScriptCode: script ? script.innerHTML : "",
        styles: styles ? styles.innerHTML : ""
    }
}

// Parses the component's raw script code to extract and validate properties, methods, and proxies.
// It checks server-provided properties against the component's expected properties (defined in script).
function parseComponentScript(rawScriptCode, serverProps) {
    const props = {}
    let useProxy = {}
    let defMethods = {}
    let defProps = {}

    // Regex matches to extract definitions for proxies, methods, and props
    const useProxyMatch = rawScriptCode.match(/useProxy\s*\(\s*(\{[\s\S]*?\})\s*\)/)
    const defMethodsMatch = rawScriptCode.match(/defMethods\s*\(\s*(\{[\s\S]*?\})\s*\)/)
    const defPropsMatch = rawScriptCode.match(/defProps\s*\(\s*(\{[\s\S]*?\})\s*\)/)

    if (useProxyMatch) {
        useProxy = new Function('return ' + useProxyMatch[1])()
    }

    if (defMethodsMatch) {
        defMethods = new Function('return ' + defMethodsMatch[1])()
    }

    if (defPropsMatch) {
        defProps = new Function('return ' + defPropsMatch[1])()
    }

    // Validate the properties passed from the server against the component's defined props
    for (const key in defProps) {
        if (!(key in serverProps)) {
            throw new errStore.PropsError(`The property '${key}' is not defined. Ensure it is passed as a prop.`)
        }

        const actualType = typeof serverProps[key]
        const expectedType = defProps[key].name.toLowerCase()
        if (actualType !== expectedType) {
            throw new errStore.PropsTypeError(`Property '${key}' expects type '${expectedType}', but received type '${actualType}'.`)
        }

        if (key in useProxy) {
            throw new errStore.PropsDuplicateError(`Property '${key}' is already defined in 'useProxy'.`)
        }

        props[key] = serverProps[key]
    }

    return {
        useProxy,
        defMethods,
        props
    }
}

module.exports = {
    findComponent,
    loadComponent,
    parseComponentScript
}