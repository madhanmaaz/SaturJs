const path = require("path")

const cwd = process.cwd()
const workingRoot = cwd
const buildRoot = path.join(cwd, ".satur")

module.exports = {
    isEdge: false,
    environment: "--prod",
    openDelimiter: "{{",
    closeDelimiter: "}}",
    devExt: "html",
    prodExt: "js",
    workingDIR: {
        root: workingRoot,
        public: path.join(workingRoot, "public"),
        src: path.join(workingRoot, "src")
    },
    buildDIR: {
        root: buildRoot,
        public: {
            root: path.join(buildRoot, "public"),
            jsChunks: path.join(buildRoot, "public", "js-chunks"),
            cssChunks: path.join(buildRoot, "public", "css-chunks"),
            browserPackages: path.join(buildRoot, "public", "browser-packages"),
        },
        src: path.join(buildRoot, "src"),
        lastModifiedFile: path.join(buildRoot, "lastModified.json"),
    },
    BUILDID: null,
}