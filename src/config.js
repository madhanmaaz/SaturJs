// Configuration object for the application
module.exports = {
    // Path or settings related to view templates (default is null, can be set dynamically)
    views: null,

    // Boolean to indicate whether the app is in development mode
    // If true, the app may display more verbose error messages and enable hot-reloading, logging, etc.
    dev: true,

    // Default file extension for template or component files
    // Used to resolve file paths when loading views/components.
    ext: "html",

    // The opening delimiter for template placeholders or directives
    // For example, {{ variableName }} would be replaced by a value in the template.
    openDelimiter: "{{",

    // The closing delimiter for template placeholders or directives
    closeDelimiter: "}}",

    // App version, initialized as null and can be dynamically updated
    version: null,

    // WebSocket port used for real-time communication between the server and client
    // This is typically used in development for things like hot-reload features
    wsPort: 5501
}