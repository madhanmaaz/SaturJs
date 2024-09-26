const errStore = require("./errStore")
const helpers = require("./helpers")
const config = require("./config")

// Compiles a template string into executable JavaScript code that renders HTML with provided data.
// It parses and replaces custom template delimiters and directives with JavaScript code.
function compile(template, compileErrStore) {
    const regex = new RegExp(`${helpers.escapeRegExp(config.openDelimiter)}([-=#/$@>]|if|else|for)?\\s*([\\s\\S]*?)\\s*${helpers.escapeRegExp(config.closeDelimiter)}`, 'g')
    let code = 'let __result = ""; with(dataOptions) {'
    let cursor = 0
    let match
    let line = 1

    while ((match = regex.exec(template)) !== null) {
        const beforeMatch = template.slice(cursor, match.index)
        code += `__result += ${JSON.stringify(beforeMatch)};\n`
        line += (beforeMatch.match(/\n/g) || []).length

        const type = match[1]
        const content = match[2].trim()

        // Add line number tracking for development error reporting
        if (config.dev) {
            code += `__errDoc.l = ${line};`
            compileErrStore.line = line
        }

        code += handleDirective(type, content)
        cursor = regex.lastIndex
    }

    code += `__result += ${JSON.stringify(template.slice(cursor))};\n}`
    code += 'return __result;'

    // In development mode, wrap the code in a try-catch block to capture and report errors
    if (config.dev) {
        code = `const __errDoc = { l: 0 }; try { ${code} } catch(error) {__errDoc.error = error; return __errDoc; }`
    }

    return new Function('dataOptions', code)
}

function handleDirective(type, content) {
    switch (type) {
        case "$": {
            const blockName = content.slice(0, content.indexOf("("))
            let args = content.slice(content.indexOf("("))
            args = args.substring(1, args.length - 1)
            if (args.length == 0) args = '{}'
            return `__result += this.renderBlocks("${blockName}", ${args});`
        }
        case "@": { // render components
            const componentName = content.slice(0, content.indexOf("("))
            let args = content.slice(content.indexOf("("))
            args = args.substring(1, args.length - 1)
            if (args.length == 0) args = '{}'
            return `__result += this.renderComponent(this.filePath,"${componentName}",${args},this._show);\n`
        }
        case ">": // code
            return `\n${content};\n`
        case "if": // if condition
            return `if(${content}){\n`
        case "else": // else
            return content.startsWith("if") ? `} else if(${content.slice(3)}){\n` : "} else {\n"
        case "for": {  // loop
            const [variables, data] = content.split(" in ")
            const [key, value] = variables.split(",")

            return `for(const [${value || '_'}, ${key}] of (Array.isArray(${data}) ? Object.entries(${data}).map(e => { e[0] = parseInt(e[0]); return e }) : Object.entries(${data}))){\n`
        }
        case "/":
            return `};\n`
        case "#":
            return ''
        case "-": // no escapehtml
            return `__result += ${content};\n`
        default: // escapehtml
            return `__result += this.escapeHTML(${content});\n`
    }
}

// Compiles a template and caches the result for future use.
// Renders the template with the provided data options.
function compileTemplate(thisArgs, template, data) {
    const compileErrStore = { line: 0 }
    const cacheKey = helpers.getCacheKey(thisArgs.filePath)
    let func = helpers.templateCache.get(cacheKey)

    if (!func) {
        try {
            func = compile(template, compileErrStore)
            helpers.templateCache.set(cacheKey, func)
        } catch (error) {
            throw new errStore.TemplateCompileError(`${error.message}\nFILE: ${thisArgs.filePath}\n${helpers.createErrorSnippet(template, compileErrStore.line)}\n`)
        }
    }

    // Execute the compiled template function with the provided data
    const output = func.call(thisArgs, data)
    if (typeof output == "string") return output

    // Handle errors during rendering by throwing a TemplateRenderError
    const errorObj = new errStore.TemplateRenderError(`${output.error.message}\nFILE: ${thisArgs.filePath}\n${helpers.createErrorSnippet(template, output.l)}\n`)
    errorObj.name = output.error.name in errStore ? output.error.name : errorObj.name
    throw errorObj
}

module.exports = {
    compileTemplate,
    compile
}