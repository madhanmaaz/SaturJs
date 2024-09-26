const WebSocket = require('ws')
const path = require("path")
const http = require("http")

const blocksLoader = require("./src/blocksLoader")
const errStore = require("./src/errStore")
const config = require("./src/config")
const engine = require("./src/engine")


function setup(app, options = config) {
    if (options.version == null) {
        throw new SaturError("SaturJs app requires a valid version of your app. Please provide a version number in the configuration.")
    }

    !options.views && (options.views = app.get("views"))
    Object.assign(config, options)

    // loading blocks
    blocksLoader.load(path.join(config.views, "_blocks"))

    app.set("views", config.views)
    app.set("view engine", config.ext)
    app.engine(config.ext, (view, data, callback) =>
        callback(null, engine.renderFile(view, data))
    )

    app.use("/saturjs", require("./src/router"))

    if (config.dev) {
        new WebSocket.Server({ port: config.wsPort })
    }
}

function errorHandler(app) {
    app.use((_, res) => {
        throw new errStore.SaturError("This page could not be found.", 404)
    })

    app.use((err, req, res, next) => {
        const status = err.status || 500
        const title = http.STATUS_CODES[status]

        if (err.name !== "SaturError") {
            console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.url}: ${err.stack}`);
        }

        res.status(status).render("_err", {
            status,
            title,
            err,
            dev: config.dev,
        })
    })
}

module.exports = {
    setup,
    errorHandler,
    SaturError: errStore.SaturError
}