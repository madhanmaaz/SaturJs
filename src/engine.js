const HTMLParser = require("node-html-parser")
const htmlMinifier = require("html-minifier")
const acornWalk = require("acorn-walk")
const uglifyJS = require("uglify-js")
const esbuild = require("esbuild")
const acorn = require("acorn")
const path = require("path")
const fs = require("fs")

const attributeModifier = require("./attributeModifier")
const errStore = require("./errStore")
const compiler = require("./compiler")
const helpers = require("./helpers")
const config = require("./config")

const __BUILDID = config.BUILDID ? `?v=${config.BUILDID}` : ''
const RuntimeCache = {
    browserPackages: [],
    componentChunks: [],
    cssChunks: [],
}

const FileManager = {
    writeFile(filePath, data) {
        try {
            if (config.environment === "--dev") {
                return fs.writeFileSync(filePath, data, "utf-8")
            }

            const minified = uglifyJS.minify(data, {
                module: false
            })

            if (minified.error) {
                throw minified.error
            }

            fs.writeFileSync(filePath, minified.code, "utf-8")
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`)
        }
    },
    createDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
        }
    },
    generateBuildPath(filePath) {
        const buildFilePath = filePath.replace(config.workingDIR.src, config.buildDIR.src)
        const newDirname = path.dirname(buildFilePath)
        const newBasename = path.basename(buildFilePath).replace(
            `.${config.devExt}`,
            `.${config.prodExt}`
        )

        FileManager.createDirectory(newDirname)
        return path.join(newDirname, newBasename)
    },
    generateChunkjsPath(settings) {
        const newDirname = path.dirname(settings.src.replace(config.workingDIR.src, config.buildDIR.public.jsChunks))
        const componentChunkJsPath = path.join(newDirname,
            `${settings.name}-chunk.js`
        )

        return {
            requirePath: componentChunkJsPath.replace(config.buildDIR.root, ""),
            componentChunkJsPath,
            webPath: componentChunkJsPath.replace(config.buildDIR.public.root, "")
        }
    },
    generateChunkCssPath(settings) {
        const newDirname = path.dirname(settings.src.replace(config.workingDIR.src, config.buildDIR.public.cssChunks))
        const componentChunkCssPath = path.join(
            newDirname,
            `${settings.name}-chunk.css`
        )

        return {
            componentChunkCssPath,
            webPath: componentChunkCssPath.replace(config.buildDIR.public.root, "")
        }
    }
}

const ComponentParser = {
    parseImports(document) {
        return document.querySelectorAll("import").map(component => {
            const src = component.attributes["src"]
            component.remove()
            return src
        }).filter(src => src.length > 0)
    },
    parseServerScript(document) {
        const script = document.querySelector("script")
        if (!script || script.attributes["server"] == null) {
            return ""
        }

        const code = script.innerHTML
        script.remove()
        return code.trim()
    },
    parseStyles(dom) {
        const style = dom.querySelector("style")
        if (style) {
            return style.innerHTML
        }
    },
    parseTemplate(dom, settings) {
        const template = dom.querySelector("template")
        if (!template) {
            throw new errStore.TemplateElementNotFound(`The <template> element not found in '${settings.name}' component.`)
        }

        const firstElement = template.childNodes.find(element => element.nodeType === 1)
        if (!firstElement) {
            throw new errStore.ChildLimitError(`The '${settings.name}' component's template must include at least one child element.`)
        }

        firstElement.setAttribute("element", helpers.wrapDelimiter("$ctxKey"))
        attributeModifier.modifyAttributes(firstElement)
        return firstElement.outerHTML
    }
}

const ModuleBundler = {
    bundlePackages(moduleRef, settings) {
        const moduleName = moduleRef.startsWith(".")
            ? path.basename(moduleRef).split(".")[0]
            : moduleRef

        const outFilePath = path.join(config.buildDIR.public.browserPackages, `${moduleName}.min.js`)
        RuntimeCache.browserPackages.push(`<script src="/browser-packages/${moduleName}.min.js${__BUILDID}"></script>`)
        if (!moduleRef.startsWith(".") && fs.existsSync(outFilePath)) return

        if (config.environment !== "--dev") {
            console.log(`[+] Bundling - ${moduleName}`)
        }

        esbuild.buildSync({
            platform: "browser",
            stdin: {
                contents: `
if (typeof window !== "undefined" && typeof Satur !== "undefined") {
    Satur.browserPackages["${moduleName}"] = require("${moduleRef}")
}`,
                resolveDir: path.dirname(settings.src),
                loader: 'js',
            },
            bundle: true,
            outfile: outFilePath,
            minify: config.environment !== "--dev",
        })
    },
    buildRequiredModules(code, settings) {
        const ast = acorn.parse(code, {
            sourceType: "script",
            ecmaVersion: 2020,
        })

        acornWalk.simple(ast, {
            CallExpression(node) {
                if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
                    ModuleBundler.bundlePackages(node.arguments[0].value, settings)
                }
            },
        })
    },
    bundleClient() {
        const rootClient = path.join(__dirname, "client")
        const files = fs.readdirSync(rootClient)

        files.forEach(file => {
            const filePath = path.join(rootClient, file)
            const outFilePath = path.join(config.buildDIR.public.browserPackages, file)

            if (fs.existsSync(outFilePath)) return
            FileManager.createDirectory(path.dirname(outFilePath))

            const code = fs.readFileSync(filePath, "utf-8")
            const minified = uglifyJS.minify(code, {
                module: false,
            })

            if (minified.error) {
                throw minified.error
            }

            fs.writeFileSync(outFilePath, minified.code, "utf-8")
        })
    }
}

const TemplateCompiler = {
    compile(templateString, settings) {
        const compileErrStore = { line: 0 }

        try {
            const code = compiler.compile(templateString, compileErrStore)
            return Snippets.wrapTemplate(code)
        } catch (error) {
            throw new errStore.TemplateCompileError(
                `${error.message}\nFILE: ${settings.src}\n${helpers.createErrorSnippet(templateString, compileErrStore.line)}\n`
            )
        }
    }
}

const Snippets = {
    getComponentImports(imports) {
        let componentImports = ""
        for (let component of imports) {
            component = component.split(`.${config.devExt}`)[0]
            const componentName = path.basename(component)
            componentImports += `"${componentName}": require("${component}").__render__.bind(null, __pageProps__),`
        }

        return `const __getComponents__ = {
            ${componentImports}
        }`
    },
    wrapTemplate(code) {
        return `function __template__(
            $, 
            $$,
            $ctxKey,
            $pageProps,
            $isServer
        ) {
            ${code}
        }`
    }
}

function buildComponent(document, settings, imports) {
    // css chunk
    let styles = ComponentParser.parseStyles(document)
    if (styles) {
        const { componentChunkCssPath, webPath } = FileManager.generateChunkCssPath(settings)
        RuntimeCache.cssChunks.push(`<link href="${webPath}${__BUILDID}" rel="stylesheet">`)
        FileManager.createDirectory(path.dirname(componentChunkCssPath))
        fs.writeFileSync(componentChunkCssPath, styles, "utf-8")
    }

    // js chunk
    const templateString = ComponentParser.parseTemplate(document, settings)

    const templateCode = TemplateCompiler.compile(templateString, settings)
    const script = document.querySelector("script")
    let hooksScript = "function __hooksScript__(){}"

    if (script) {
        ModuleBundler.buildRequiredModules(script.innerHTML.trim(), settings)
        hooksScript = `function __hooksScript__(
            defProps, 
            defProxy,
            defMethods, 
            defEvents, 
            defWatch, 
            defLoad, 
            defError,
            useSignal
        ) {
            ${script.innerHTML.trim()}
        }`
    }

    let jsChunkCode = `
    (function (require) {
        ${templateCode}
        ${hooksScript}

        if (typeof module !== "undefined" && module.exports) {
            module.exports = {
                __template__,
                __hooksScript__
            }
        } else if (typeof window !== "undefined" && typeof Satur !== "undefined") {
            Satur.components["${settings.name}"] = __template__
            Satur.callbacks["${settings.name}"] = __hooksScript__
        }
    })(function (packageName) {
        if(typeof Satur === "undefined") {
            const proxy = new Proxy({}, {
                get(target, key) {
                    return proxy
                }
            })

            return proxy
        }
            
        return Satur.browserPackages[packageName]
    })
    `

    const { componentChunkJsPath, webPath, requirePath } = FileManager.generateChunkjsPath(settings)
    RuntimeCache.componentChunks.push(`<script src="${webPath}${__BUILDID}"></script>`)
    FileManager.createDirectory(path.dirname(componentChunkJsPath))
    FileManager.writeFile(componentChunkJsPath, jsChunkCode)

    // componentjs
    let componentJsCode = `
    const path = require("path")
    const __componentHelpers__ = require("saturjs/src/component-utils")
    const __componentChunk__ = require(path.join(process.cwd(), ".satur", ${JSON.stringify(requirePath)}))
    const __componentSettings__ = ${JSON.stringify(settings)}

    function __render__(__pageProps__, props = {}) {
        ${Snippets.getComponentImports(imports)}
        const ctxKey = __componentHelpers__.createContextKey(__pageProps__, props, __componentSettings__)
        const hooksData = __componentHelpers__.hooksDataCollector(
            __componentChunk__.__hooksScript__,
            props,
            __componentSettings__
        )

        const output = __componentChunk__.__template__.call(
            __componentHelpers__.thisArgs,              // this args
            hooksData,                                  // data
            __getComponents__,                          // comps
            ctxKey,                                     // ctxKey
            null,                                       // pageProps
            true,                                       // is server
        )
        
        if (typeof output === "string") return {
            __SATUR_COMPONENT__: true,
            html: output
        }

        ${config.environment === "--dev"
            ? `__componentHelpers__.throwRenderError("${btoa(templateString)}",output, __componentSettings__)`
            : `throw new Error("Render component error")`
        }
    }
    
    module.exports = {
        __render__
    }
    `

    FileManager.writeFile(settings.filename, componentJsCode)
}

// Generating page code
function buildPage(document, settings, imports) {
    ModuleBundler.bundleClient() // bundle client side runtimes
    const serverScriptCode = ComponentParser.parseServerScript(document)

    // Page head alters
    document.querySelector("head").appendChild(`
    ${RuntimeCache.cssChunks.join('')}
    
    <script src="/browser-packages/client-runtime.js"></script>
    ${RuntimeCache.browserPackages.join('')}
    `)

    RuntimeCache.cssChunks = []
    RuntimeCache.browserPackages = []
    if (config.environment === "--dev") {
        document.querySelector("head").appendChild(`<script src="/browser-packages/dev-runtime.js"></script>`)
    }


    // Page body alters
    document.querySelector("body").appendChild(`
        <script>Satur.pageProps = {{- this.esc2Uni($pageProps) }}</script>
        ${RuntimeCache.componentChunks.join('')}
    `)
    RuntimeCache.componentChunks = []

    // alter attributes
    attributeModifier.modifyAttributes(document)

    // compile template
    const templateString = document.outerHTML.trim()
    const templateCode = TemplateCompiler.compile(templateString, settings)

    let code = `
    const __componentHelpers__ = require("saturjs/src/component-utils")
    const __componentSettings__ = ${JSON.stringify(settings)}
    ${serverScriptCode}
    ${templateCode}

    async function __render__() {
        let __pageProps__ = {}
        let serverData = {}

        if (typeof defServer !== "undefined") {
            serverData = await defServer(...arguments)
        }
        
        ${Snippets.getComponentImports(imports)}

        const output = __template__.call(
            __componentHelpers__.thisArgs,              // this args
            serverData,                                 // data
            __getComponents__,                          // comps
            null,                                       // ctxKey
            __pageProps__,                              // pageProps
            true,                                       // is server
        )

        if (typeof output === "string") return output
        ${config.environment === "--dev"
            ? `__componentHelpers__.throwRenderError("${btoa(templateString)}", output, __componentSettings__)`
            : `throw new Error("Render error")`
        }
    }

    module.exports = {
        __render__
    }
    `

    FileManager.writeFile(settings.filename, code)
    return settings.filename
}

function buildTemplate(pagePath, isComponent) {
    if (!fs.existsSync(pagePath)) {
        throw new errStore.ComponentNotFound(
            `Component not found: ${pagePath} `
        )
    }

    let htmlData = fs.readFileSync(pagePath, "utf-8")
    if (config.environment !== "--dev") {
        htmlData = htmlMinifier.minify(htmlData, {
            collapseWhitespace: true,
            keepClosingSlash: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: false,
            minifyURLs: false
        })
    }

    const document = HTMLParser.parse(htmlData, {})
    const settings = {
        name: path.basename(pagePath).split(".")[0],
        filename: FileManager.generateBuildPath(pagePath),
        src: pagePath
    }

    // Process imported components
    const imports = ComponentParser.parseImports(document)
    imports.forEach(componentPath => {
        buildTemplate(
            path.resolve(path.dirname(pagePath), componentPath),
            true
        )
    })

    if (config.environment !== "--dev") {
        console.log(`[+] Building - ${settings.src}`)
    }

    if (isComponent) {
        return buildComponent(document, settings, imports)
    }

    return buildPage(document, settings, imports)
}

module.exports = {
    buildTemplate
}