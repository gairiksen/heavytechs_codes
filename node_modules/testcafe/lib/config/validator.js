var ERR = require("./../server/server_errs"), revalidator = require("revalidator");

var CFG_SCHEMA = {
    additionalProperties: true,
    properties: {
        controlPanelPort: {
            maximum: 65535,
            minimum: 0,
            required: true,
            type: "integer",
            messages: {
                maximum: ERR.CONFIG_PORT_VALUE_IS_OUT_OF_RANGE,
                minimum: ERR.CONFIG_PORT_VALUE_IS_OUT_OF_RANGE,
                required: ERR.CONFIG_PROPERTY_IS_REQUIRED,
                type: ERR.CONFIG_PORT_VALUE_IS_NOT_NUMBER
            }
        },
        servicePort: {
            maximum: 65535,
            minimum: 0,
            required: true,
            type: "integer",
            messages: {
                maximum: ERR.CONFIG_PORT_VALUE_IS_OUT_OF_RANGE,
                minimum: ERR.CONFIG_PORT_VALUE_IS_OUT_OF_RANGE,
                required: ERR.CONFIG_PROPERTY_IS_REQUIRED,
                type: ERR.CONFIG_PORT_VALUE_IS_NOT_NUMBER
            }
        },
        servicePort2: {
            maximum: 65535,
            minimum: 0,
            required: false,
            type: "integer",
            messages: {
                maximum: ERR.CONFIG_PORT_VALUE_IS_OUT_OF_RANGE,
                minimum: ERR.CONFIG_PORT_VALUE_IS_OUT_OF_RANGE,
                required: ERR.CONFIG_PROPERTY_IS_REQUIRED,
                type: ERR.CONFIG_PORT_VALUE_IS_NOT_NUMBER
            }
        },
        testsDir: {
            minLength: 1,
            required: true,
            type: "string",
            messages: {
                minLength: ERR.CONFIG_PROPERTY_CAN_NOT_BE_EMPTY,
                required: ERR.CONFIG_PROPERTY_IS_REQUIRED,
                type: ERR.CONFIG_PROPERTY_IS_NOT_STRING
            }
        },
        hostname: {
            minLength: 1,
            type: "string",
            messages: {
                minLength: ERR.CONFIG_PROPERTY_CAN_NOT_BE_EMPTY,
                type: ERR.CONFIG_PROPERTY_IS_NOT_STRING
            }
        },
        reportsPath: {
            minLength: 1,
            type: "string",
            messages: {
                minLength: ERR.CONFIG_PROPERTY_CAN_NOT_BE_EMPTY,
                type: ERR.CONFIG_PROPERTY_IS_NOT_STRING
            }
        },
        browsers: {
            patternProperties: {
                "(.*)": {
                    additionalProperties: false,
                    type: "object",
                    properties: {
                        cmd: {
                            type: "string",
                            messages: {
                                type: ERR.CONFIG_PROPERTY_IS_NOT_STRING
                            }
                        },
                        path: {
                            minLength: 1,
                            required: true,
                            type: "string",
                            messages: {
                                minLength: ERR.CONFIG_PROPERTY_CAN_NOT_BE_EMPTY,
                                required: ERR.CONFIG_PROPERTY_IS_REQUIRED,
                                type: ERR.CONFIG_PROPERTY_IS_NOT_STRING
                            }
                        },
                        icon: {
                            type: "string",
                            messages: {
                                type: ERR.CONFIG_PROPERTY_IS_NOT_STRING
                            }
                        }
                    },
                    messages: {
                        type: ERR.CONFIG_INVALID_PROPERTY_FORMAT
                    }
                }
            },
            type: "object",
            messages: {
                type: ERR.CONFIG_INVALID_PROPERTY_FORMAT
            }
        },
        recorder: {
            type: "object",
            properties: {
                showSteps: {
                    type: "boolean",
                    messages: {
                        type: ERR.CONFIG_INVALID_PROPERTY_FORMAT
                    }
                }
            },
            messages: {
                type: ERR.CONFIG_INVALID_PROPERTY_FORMAT
            }
        }
    }
};

exports.validate = function(cfgObj, strong) {
    var result = revalidator.validate(cfgObj || {}, CFG_SCHEMA);
    if (!result.valid) {
        result.errors = result.errors.map(function(err) {
            if (err.attribute === "additionalProperties") err.message = ERR.CONFIG_UNSUPPORTED_PROPERTY;
            if (err.property === "(.*)") err.property = "browsers";
            return {
                code: err.message,
                property: err.property
            };
        });
    }
    if (!strong) {
        var errCount = result.errors.length;
        for (var i = errCount - 1; i >= 0; i--) {
            if (result.errors[i].code === ERR.CONFIG_PROPERTY_IS_REQUIRED && result.errors[i].property !== "path") result.errors.splice(i, 1);
        }
    }
    return result.errors;
};