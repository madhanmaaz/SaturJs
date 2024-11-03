const express = require("express")
const WebSocket = require("ws")
const http = require("http")
const path = require("path")
const fs = require("fs")

const config = require("./config")

const args = process.argv
process.env.NODE_ENV = "production"

if (args.includes("--dev")) {
    process.env.NODE_ENV = "development"
    config.environment = "--dev"
} else if (args.includes("--prod")) {
    require("./builder").main()
} else if (args.includes("--build")) {
    require("./builder").main(true)
} else {
    config.isEdge = true

    if (!fs.existsSync(config.buildDIR.lastModifiedFile)) {
        throw new Error("Build is not found. Please run 'npm run build' to create a build.");
    }
}

const app = express()
const server = http.createServer(app)

const DEFAULT_PORT = 3000;
const SATURJS_HEADER = 'SaturJs';

// app setup
function setup({
    appRouter = null,
    port = process.env.PORT || DEFAULT_PORT,
    poweredByHeader = true,
    errorHandler
}) {
    if (typeof appRouter !== "function") {
        throw new Error("appRouter is required. You must pass a valid router.")
    }

    // setting websocket for dev
    if (config.environment === "--dev") {
        new WebSocket.Server({ server })
    }

    // set up poweredByHeader
    app.use((req, res, next) => {
        if (poweredByHeader) {
            res.setHeader("X-Powered-By", SATURJS_HEADER)
        }
        next()
    })

    // Set static folder
    app.use(express.static(config.workingDIR.public))

    // set static folder for saturjs assets
    app.use(express.static(config.buildDIR.public.root, {
        setHeaders(res, path) {
            if (config.environment === "--dev") return

            res.setHeader("Cache-Control",
                path.endsWith(".html")
                    ? "no-cache"
                    : "public, max-age=31536000"
            )
        }
    }))

    // Set up the router for the app
    app.use(appRouter)

    // Error handling middleware
    if (typeof errorHandler === "function") {
        app.use(errorHandler)
    } else {
        app.use((err, req, res, next) => {
            err && console.error(err)
            renderPage("error")(err, req, res, next)
        })
    }

    // If not in Edge/Serverless mode, start the HTTP server
    if (config.isEdge) {
        console.log('Running in Edge/Serverless mode.')
    } else {
        server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`)
        })
    }

    return server
}

const defaultExt = config.environment === "--dev" ? config.devExt : config.prodExt
const defaultDir = config.environment === "--dev" ? config.workingDIR.src : config.buildDIR.src

function renderPage(pageName) {
    return function () {
        let filePath = path.resolve(defaultDir, `${pageName}.${defaultExt}`)

        if (config.environment === "--dev") {
            filePath = require("./engine").buildTemplate(filePath)
        }

        require(filePath)
            .__render__(...arguments)
            .then(html => {
                const res = arguments.length == 3 ? arguments[1] : arguments[2]

                if (!res.headersSent) {
                    res.send(html)
                }
            }).catch(error => {
                const next = arguments.length == 3 ? arguments[2] : arguments[3]
                next(error)
            })
    }
}


module.exports = {
    setup,
    renderPage,
    server,
    app,
    express,
    Router: express.Router,
}