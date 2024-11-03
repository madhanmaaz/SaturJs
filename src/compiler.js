const config = require("./config")

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function handleDirective(type, content) {
    switch (type) {
        case '#':
            return ''
        case '/':
            return "}\n;"
        case "-":
            return `__result += this.display(${content});\n`

        // loops
        case "for (":
        case "for(": {
            const [variables, data] = content.slice(0, -1).split(" in ")
            const [key, value] = variables.split(",")

            return `for(const [${value || '_'}, ${key}] of this.formatLoop(${data})){\n`
        }

        // conditions
        case "if(":
        case "if (":
            return `if(${content}{\n`
        case "else":
            return content.startsWith("if") ? `} else ${content}{\n` : "} else {\n"

        // displayX for default
        default:
            return `__result += this.displayX(${content});\n`
    }
}

function compile(template, compileErrStore) {
    const regex = new RegExp(`${escapeRegExp(config.openDelimiter)}\\s*([#/-]|for\\s*\\(|if\\s*\\(|else)?\\s*([\\s\\S]*?)\\s*${escapeRegExp(config.closeDelimiter)}`, 'g')
    let code = 'let __result = ""; with($) {'
    let cursor = 0
    let match
    let line = 1

    const isDev = config.environment === "--dev"

    while ((match = regex.exec(template)) !== null) {
        const beforeMatch = template.slice(cursor, match.index)
        code += `__result += ${JSON.stringify(beforeMatch)};\n`
        if (isDev) line += (beforeMatch.match(/\n/g) || []).length

        const type = match[1] == null ? match[1] : match[1].trim()
        const content = match[2].trim()

        if (isDev) {
            code += `__errDoc.l = ${line};\n`
            compileErrStore.line = line
        }

        code += handleDirective(type, content)
        cursor = regex.lastIndex
    }

    code += `__result += ${JSON.stringify(template.slice(cursor))};}\n`
    code += 'return __result;'

    // In development mode, wrap the code in a try-catch block to capture and report errors
    if (isDev) {
        code = `
        const __errDoc = { l: 0 }; 
        try { ${code} } 
        catch(error) {
            __errDoc.error = error; 
            return __errDoc; 
        }`
    }

    return code
}

module.exports = {
    compile
}