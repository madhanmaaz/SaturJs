const express = require("express")
const path = require("path")

const helpers = require("./helpers")
const config = require("./config")

const router = express.Router()
const clientFilePath = path.join(__dirname, "client.js")

// Cache control headers for production and development
const cacheControl = ['Cache-Control', 'public, max-age=31536000, immutable']
const noCacheControl = ['Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0']

// Route to serve the client-side JavaScript file called client.js
router.get("/client.js", (req, res) => {
    if (!config.dev) {
        res.setHeader(...cacheControl)
    } else {
        res.setHeader(...noCacheControl)
    }

    res.sendFile(clientFilePath)
})

// Route to serve JavaScript for specific components
router.get("/js", (req, res) => {
    const { name, cacheKey } = req.query
    const func = helpers.templateCache.get(cacheKey)
    if (!func) {
        return res.send(`component ${cacheKey} not found.`)
    }

    res.setHeader("content-type", "application/javascript; charset=UTF-8")
    if (!config.dev) {
        res.setHeader(...cacheControl)
    } else {
        res.setHeader(...noCacheControl)
    }

    res.send(`Satur.components["${name}"] = ${func.toString()}`)
})

// Route to serve JavaScript for block templates
router.get("/blocks", (req, res) => {
    const { name } = req.query
    const func = helpers.blocksCache[name]
    if (!func) {
        return res.send(`block ${cacheKey} not found.`)
    }

    res.setHeader("content-type", "application/javascript; charset=UTF-8")
    if (!config.dev) {
        res.setHeader(...cacheControl)
    } else {
        res.setHeader(...noCacheControl)
    }

    res.send(`Satur.blocks["${name}"] = ${func.toString()}`)
})


module.exports = router