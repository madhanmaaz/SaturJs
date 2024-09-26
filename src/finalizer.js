const { parse: parseHTML } = require("node-html-parser")
const { minify } = require("html-minifier")

const packageJson = require("../package.json")
const config = require("./config")
const helpers = require("./helpers")

// Generates client-side scripts based on runtime cache
function clientScriptor(runtimeCache) {
    // Injects component scripts
    const componentScripts = Object.entries(runtimeCache.components).map(obj => {
        return `<script src="/saturjs/js?name=${obj[0]}&cacheKey=${obj[1]}&v=${config.version}"></script>`
    }).join('')

    // Injects block scripts
    const blocksScripts = runtimeCache.blocks.map(blockName => {
        return `<script src="/saturjs/blocks?name=${blockName}&v=${config.version}"></script>`
    }).join('')

    const callbacks = Object.keys(runtimeCache.scripts).map(key =>
    (`"${key}": (
                useProxy, 
                useSignal, 
                useWatch, 
                defProps,
                defEvents, 
                defMethods, 
                beforeMount,
                mounted,
                beforeUnmount,
                unmounted, 
                beforeUpdate,
                updated,
        ) => {${runtimeCache.scripts[key]}}`))

    return `
<script src="/saturjs/client.js?v=${packageJson.version}"></script>
${componentScripts}
${blocksScripts}
<script>
Satur.openDelimiter = "${config.openDelimiter}"
Satur.closeDelimiter = "${config.closeDelimiter}"
Satur.serverStates = ${JSON.stringify(runtimeCache.serverStates)};
Satur.callbacks = {${callbacks}}
</script>

${config.dev ? helpers.devWsScript() : ''}
`
}

// Finalizes the HTML template, minifies it, and injects the necessary scripts and styles
function finalizeTemplate(html, runtimeCache) {
    const document = parseHTML(html)
    let cssCode = ""
    for (const key in runtimeCache.styles) {
        cssCode += runtimeCache.styles[key]
    }

    // head
    const head = document.querySelector("head")
    if (head) {
        head.innerHTML += `
        <style>${cssCode}</style>
        `
    }

    // body
    const body = document.querySelector("body")
    if (body) {
        body.innerHTML += clientScriptor(runtimeCache)
    }

    resetCache(runtimeCache)
    return minify(document.outerHTML, {
        minifyJS: true,
        minifyCSS: true
    })
}

// Resets the runtime cache after each template finalization
function resetCache(runtimeCache) {
    runtimeCache.blocks = []
    runtimeCache.components = {}
    runtimeCache.serverStates = {}
    runtimeCache.scripts = {}
    runtimeCache.styles = {}
}

module.exports = {
    finalizeTemplate
}