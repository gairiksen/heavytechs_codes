var fs = require("fs"), path = require("path"), Const = require("./const");

var CLIENT_UI_CSS_FILE_PATH = "../../_compiled_/testcafe_client/styles.css", CLIENT_UI_SPRITE_FILE_PATH = "../../_compiled_/testcafe_client/uisprite.png", CLIENT_CORE_SCRIPT_FILE_PATH = "../../_compiled_/testcafe_client/testcafe_core.js", CLIENT_RECORDER_SCRIPT_FILE_PATH = "../../_compiled_/testcafe_client/testcafe_recorder.js", CLIENT_UI_CORE_SCRIPT_FILE_PATH = "../../_compiled_/testcafe_client/testcafe_ui_core.js", CLIENT_UI_RECORDER_SCRIPT_FILE_PATH = "../../_compiled_/testcafe_client/testcafe_ui_recorder.js", TEMPLATE_VAR_PATTERN = /"<@\s*(\S+)\s*@>"/g;

function readFile(filePath, binary) {
    var fileData = fs.readFileSync(path.join(__dirname, filePath));
    return binary ? fileData : fileData.toString();
}

exports.TEMPLATES = {
    TEST_RUN: readFile("../../_compiled_/testcafe_client/test_run.jstmpl"),
    IFRAME_TEST_RUN: readFile("../../_compiled_/testcafe_client/iframe_test_run.jstmpl"),
    TEST_RUN_ERR_HANDLER: readFile("../../_compiled_/testcafe_client/test_run_err_handler.jstmpl"),
    RECORDING: readFile("../../_compiled_/testcafe_client/recording.jstmpl"),
    IFRAME_RECORDING: readFile("../../_compiled_/testcafe_client/iframe_recording.jstmpl"),
    RECORDING_ERR_PAGE: readFile("../../_compiled_/testcafe_client/recorder_server_err_page.jstmpl"),
    RECORDING_AUTHENTICATION_PAGE: readFile("../../_compiled_/testcafe_client/authentication_page.jstmpl")
};

exports.getStaticResources = function() {
    return {
        scripts: [ {
            path: "/testcafe_core.js",
            contentType: "application/x-javascript",
            content: readFile(CLIENT_CORE_SCRIPT_FILE_PATH)
        }, {
            path: "/testcafe_recorder.js",
            contentType: "application/x-javascript",
            content: readFile(CLIENT_RECORDER_SCRIPT_FILE_PATH),
            requiredJobOwnerToken: Const.RECORDER_JOB_OWNER_TOKEN
        }, {
            path: "/testcafe_ui_core.js",
            contentType: "application/x-javascript",
            content: readFile(CLIENT_UI_CORE_SCRIPT_FILE_PATH)
        }, {
            path: "/testcafe_ui_recorder.js",
            contentType: "application/x-javascript",
            content: readFile(CLIENT_UI_RECORDER_SCRIPT_FILE_PATH),
            requiredJobOwnerToken: Const.RECORDER_JOB_OWNER_TOKEN
        } ],
        css: {
            path: "/uistyle.css",
            contentType: "text/css",
            content: readFile(CLIENT_UI_CSS_FILE_PATH)
        },
        others: [ {
            path: "/uisprite.png",
            contentType: "image/png",
            content: readFile(CLIENT_UI_SPRITE_FILE_PATH, true)
        } ]
    };
};

exports.compileTemplate = function(template, vars) {
    return template.replace(TEMPLATE_VAR_PATTERN, function(subStr, arg) {
        return vars && typeof vars[arg] !== "undefined" ? vars[arg] : subStr;
    });
};