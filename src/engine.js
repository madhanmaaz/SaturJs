const { parse: parseHTML } = require("node-html-parser")
const fs = require("fs")


const attributeModifier = require("./attributeModifier")
const componentLoader = require("./componentLoader")
const { finalizeTemplate } = require("./finalizer")
const compiler = require("./compiler")
const helpers = require("./helpers")
const config = require("./config")


// Runtime cache to store processed blocks, components, styles, and scripts
const runtimeCache = {
    blocks: [],          // block names
    components: {},      // componentName: cachekey
    serverStates: {},    // Holds component-specific server states
    scripts: {},         // Cache for JavaScript code associated with components
    styles: {},          // Cache for styles (CSS) associated with components
}

// Render a file by reading the template, processing it, and compiling it.
function renderFile(filePath, data) {
    const cacheKey = helpers.getCacheKey(filePath)
    let htmlData = ''

    // If running in dev mode or cache is not available, re-read the file
    if (config.dev || helpers.templateCache.get(cacheKey) == null) {
        htmlData = fs.readFileSync(filePath, "utf-8")
        htmlData = parseHTML(htmlData)
        attributeModifier.eventAttributes(htmlData)
        htmlData = attributeModifier.voidAttributes(htmlData.outerHTML)
    }

    // Compile the template by passing the necessary functions and data
    const renderedTemplate = compiler.compileTemplate({
        filePath,
        _show: true,
        renderComponent,
        renderBlocks,
        escapeHTML: helpers.escapeHTML,
    }, htmlData, data)

    return finalizeTemplate(renderedTemplate, runtimeCache)
}

// Render a component by loading the component template, 
// applying any server-side props, and compiling it.
function renderComponent(filePath, componentReference, serverProps, _show) {
    const { componentName, componentPath } = componentLoader.findComponent(filePath, componentReference)
    const { template, rawScriptCode, styles } = componentLoader.loadComponent(componentPath, componentName)
    const dataOptions = componentLoader.parseComponentScript(rawScriptCode, serverProps)
    const cacheKey = helpers.getCacheKey(componentPath)

    // Generate a unique context key for a component, which helps manage its state.
    const serverStates = runtimeCache.serverStates[componentName]
    const contextKey = serverStates ? `${componentName}_${Object.keys(serverStates).length}` : componentName

    // Sets important attributes on the component's HTML template.
    attributeModifier.eventAttributes(template)
    template.setAttribute("element", helpers.wrapDelimiter("this.contextKey"))
    template.setAttribute("css", componentName)

    // If the component is not already cached, cache its data
    if (!runtimeCache.components[componentName]) {
        runtimeCache.components[componentName] = cacheKey
        runtimeCache.styles[componentName] = styles.trim()
        runtimeCache.serverStates[componentName] = {}

        if (rawScriptCode.length !== 0) {
            runtimeCache.scripts[componentName] = rawScriptCode
        }
    }

    runtimeCache.serverStates[componentName][contextKey] = dataOptions.props

    const renderedTemplate = compiler.compileTemplate({
        filePath: componentPath,
        _show,
        renderComponent,
        renderBlocks,
        escapeHTML: helpers.escapeHTML,
        contextKey
    }, template.outerHTML, {
        ...dataOptions.useProxy,
        ...dataOptions.defMethods,
        ...dataOptions.props
    })

    return _show ? attributeModifier.voidAttributes(renderedTemplate) : ''
}

// Render blocks by invoking the block's function and passing arguments to it.
function renderBlocks(blockName, args) {
    const func = helpers.blocksCache[blockName]
    if (func) {
        // If the block hasn't been rendered yet, cache it
        if (!runtimeCache.blocks.includes(blockName)) {
            runtimeCache.blocks.push(blockName)
        }

        const output = func.call({ escapeHTML: helpers.escapeHTML, renderBlocks }, args)
        return typeof output === "string" ? output : ''
    }

    return ''
}

module.exports = {
    renderFile
}