const path = require("path")
const fs = require("fs")

const config = require("./config")

// read files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath)

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file)

        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles)
        } else {
            arrayOfFiles.push(fullPath)
        }
    })

    return arrayOfFiles
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

function wrapDelimiter(content) {
    return `${config.openDelimiter}${content}${config.closeDelimiter}`
}

function reverseHTML(str) {
    const escapeChars = {
        '&apos;': "'",
        '&amp;': "&",
        '&quot;': '"',
        '&lt;': '<',
        '&gt;': '>'
        // Add more as needed
    }

    return String(str).replace(/(&apos;|&amp;)/g, char => escapeChars[char])
}

module.exports = {
    getAllFiles,
    createErrorSnippet,
    wrapDelimiter,
    reverseHTML
}