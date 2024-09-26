const config = require("./config")

// Cache for storing compiled blocks
const blocksCache = {}

// Template cache object to store, retrieve, and manage compiled templates
const templateCache = {
    store: {},
    set(key, value) {
        this.store[key] = value
    },
    get(key) {
        return this.store[key]
    },
    remove(key) {
        delete this.store[key]
    },
    reset() {
        this.store = {}
    }
}

function wrapDelimiter(content) {
    return `${config.openDelimiter}${content}${config.closeDelimiter}`
}

// Escapes HTML to prevent XSS attacks
const escapeChars = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

function escapeHTML(str) {
    if (str == null) return ""
    return String(str).replace(/[&<>"']/g, char => escapeChars[char])
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Creates a snippet of code surrounding the line where an error occurred
function createErrorSnippet(template, errLine) {
    const lines = template.split('\n')
    return lines.map((line, index) => {
        index = index + 1
        const tag = errLine == (index) ? '>>' : '  '
        return `${tag} ${index}| ${line}`
    }).slice(
        Math.max(0, errLine - 5),
        Math.min(lines.length, errLine + 5)
    ).join('\n')
}

function getCacheKey(filePath) {
    return filePath.replace(config.views, "").replace(/\\/g, "-")
}

// Development WebSocket script for live reloading when in dev mode
function devWsScript() {
    return `
<script>
    (() => {
        const ws = new WebSocket("ws://" + location.hostname + ":${config.wsPort}")
        ws.onopen = () => {
            console.log('Connected to Development server.')
        }

        ws.onclose = () => {
            location.reload()
        }
    })()
</script>`
}

module.exports = {
    templateCache,
    blocksCache,
    wrapDelimiter,
    escapeHTML,
    createErrorSnippet,
    escapeRegExp,
    getCacheKey,
    devWsScript
}