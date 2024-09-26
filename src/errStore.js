// Custom error store for handling various application-specific errors

class TemplateCompileError extends Error {
    constructor(message) {
        super(message);
        this.name = "TemplateCompileError";
    }
}

class TemplateRenderError extends Error {
    constructor(message) {
        super(message);
        this.name = "TemplateRenderError";
    }
}

class ComponentNotFound extends Error {
    constructor(message) {
        super(message);
        this.name = "ComponentNotFound";
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

class PropsError extends Error {
    constructor(message) {
        super(message);
        this.name = "PropsError";
    }
}

class PropsTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = "PropsTypeError";
    }
}

class PropsDuplicateError extends Error {
    constructor(message) {
        super(message);
        this.name = "PropsDuplicateError";
    }
}

class SaturError extends Error {
    constructor(message = "", status = 500, stack = null) {
        super(message)
        this.name = "SaturError"
        this.status = status
        if (stack) {
            this.stack = stack
        }
    }
}

module.exports = {
    TemplateRenderError,
    TemplateCompileError,
    ComponentNotFound,
    TemplateElementNotFound,
    ChildLimitError,
    PropsError,
    PropsTypeError,
    PropsDuplicateError,
    SaturError
}