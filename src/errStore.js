// Custom error store for handling various application-specific errors

class TemplateCompileError extends Error {
    constructor(message) {
        super(message);
        this.name = "TemplateCompileError";
    }
}

class ComponentNotFound extends Error {
    constructor(message) {
        super(message)
        this.name = "ComponentNotFound"
    }
}

class TemplateRenderError extends Error {
    constructor(message) {
        super(message);
        this.name = "TemplateRenderError";
    }
}

class TemplateElementNotFound extends Error {
    constructor(message) {
        super(message);
        this.name = "TemplateElementNotFound";
    }
}

class ChildLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = "ChildLimitError";
    }
}

module.exports = {
    ComponentNotFound,
    TemplateCompileError,
    TemplateRenderError,
    TemplateElementNotFound,
    ChildLimitError,
}