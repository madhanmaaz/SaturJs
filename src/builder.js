const assert = require("assert")
const path = require("path")
const fs = require("fs")

const helpers = require("./helpers")
const config = require("./config")

// buildID
function generateBuildID() {
    return Math.random().toString(36).substring(2, 10)
}

// read all files in the src, get lastmodified
function getLatestModifiedDate() {
    const results = helpers.getAllFiles(config.workingDIR.src).map(file => {
        return [
            file,
            fs.statSync(file).mtimeMs
        ]
    })

    return Object.fromEntries(results)
}

// checking if any get modified with lastModifiedFile
function isBuildRequired(latestModifiedDate) {
    // check
    const lastModifiedDate = require(config.buildDIR.lastModifiedFile)
    try {
        assert.deepStrictEqual(latestModifiedDate, lastModifiedDate)
        return false
    } catch (error) {
        return true
    }
}

// building all src files
function startBuildProcess(latestModifiedDate) {
    const files = helpers.getAllFiles(config.workingDIR.src)

    // filtering the page files
    const filterdFiles = files.filter(file => {
        const basename = path.basename(file)
        const extname = path.extname(file)

        // checking the extension and if the first letter is lowercase
        if (extname === `.${config.devExt}` && /^[^A-Z]/.test(basename)) {
            return file
        }
    })

    // bulding the page
    filterdFiles.forEach(file => {
        require("./engine").buildTemplate(file)
    })

    // saving the lastmodified file 
    fs.writeFileSync(config.buildDIR.lastModifiedFile, JSON.stringify(latestModifiedDate), "utf-8")
    console.log("Build success.")
}

function main(isBuildOnly) {
    try {
        config.BUILDID = generateBuildID()
        const latestModifiedDate = getLatestModifiedDate()

        if (isBuildOnly) {
            console.log("Starting build process...")
            if (fs.existsSync(config.buildDIR.root)) {
                try {
                    fs.rmSync(config.buildDIR.root, { recursive: true })
                } catch (error) { }
            }

            startBuildProcess(latestModifiedDate)
            process.exit(0)
        }

        // Build all templates if lastModifiedFile doesn't exist
        if (!fs.existsSync(config.buildDIR.lastModifiedFile)) {
            console.log("No build found. Starting build process...")
            startBuildProcess(latestModifiedDate)
        }
        // Rebuild all templates if any files changed
        else if (fs.existsSync(config.buildDIR.lastModifiedFile) && isBuildRequired(latestModifiedDate)) {
            console.log("Changes detected in source files. Starting build process...")
            startBuildProcess(latestModifiedDate)
        } else {
            console.log("No changes detected. Build is not required.")
        }
    } catch (error) {
        console.log("Build failed.")
        console.log(error)
        process.exit(1)
    }
}

module.exports = {
    main
}