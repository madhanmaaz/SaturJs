const { parse: parseHTML } = require("node-html-parser")
const path = require("path")
const fs = require("fs")

const errStore = require("./errStore")
const compiler = require("./compiler")
const helpers = require("./helpers")

// Loads HTML block templates from a specified folder
// compiles them, and caches them for future use.
function load(blocksFolder) {
    const files = fs.readdirSync(blocksFolder)

    files.forEach(file => {
        const blockFilePath = path.join(blocksFolder, file)
        const blockFilename = path.basename(blockFilePath).split(".")[0] // filename

        const blocksHtml = fs.readFileSync(blockFilePath, "utf-8")
        const document = parseHTML(blocksHtml)

        // Find all <template> tags in the HTML and process them
        document.querySelectorAll("template").forEach(tem => {
            const blockFuncName = `${blockFilename}.${tem.getAttribute("name")}`
            const compileErrStore = { line: 0 }

            try {
                helpers.blocksCache[blockFuncName] = compiler.compile(tem.innerHTML, compileErrStore)
            } catch (error) {
                throw new errStore.TemplateCompileError(`${error.message}\nFILE: ${blockFilePath}\n${helpers.createErrorSnippet(blocksHtml, compileErrStore.line)}\n`)
            }
        })
    })
}

module.exports = {
    load
}