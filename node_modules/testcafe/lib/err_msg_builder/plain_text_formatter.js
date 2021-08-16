var msgBuilderUtil = require("./util"), util = require("util");

exports.buildNotEqAssert = function(err) {
    var expected = util.format("not %s", err.expected), messagePrefix = typeof err.message !== "undefined" && err.message !== null ? '"' + err.message + '" assertion' : "Assertion";
    return util.format("%s failed at step %s: %s\n" + "Expected: %s\n" + "Actual:   %s\n", messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), msgBuilderUtil.cutNewLines(expected), msgBuilderUtil.cutNewLines(err.actual));
};

exports.buildNotOkAssert = function(err) {
    var expected = "null, undefined, false, NaN or ''", messagePrefix = typeof err.message !== "undefined" && err.message !== null ? '"' + err.message + '" assertion' : "Assertion";
    return util.format("%s failed at step %s: %s\n" + "Expected: %s\n" + "Actual:   %s\n", messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), msgBuilderUtil.cutNewLines(expected), msgBuilderUtil.cutNewLines(err.actual));
};

exports.buildOkAssert = function(err) {
    var expected = "not null, not undefined, not false, not NaN and not ''", messagePrefix = typeof err.message !== "undefined" && err.message !== null ? '"' + err.message + '" assertion' : "Assertion";
    return util.format("%s failed at step %s: %s\n" + "Expected: %s\n" + "Actual:   %s\n", messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), msgBuilderUtil.cutNewLines(expected), msgBuilderUtil.cutNewLines(err.actual));
};

exports.buildEqAssert = function(err) {
    var expected = err.expected, actual = err.actual, actualMsgTitle = "Actual:   ", messagePrefix = typeof err.message !== "undefined" && err.message !== null ? '"' + err.message + '" assertion' : "Assertion", markerString = "", arrayIndexStr = "";
    if (err.isArrays) arrayIndexStr = [ "[", err.key, "]: " ].join("");
    if (err.isDates) {
        actual = msgBuilderUtil.formatDateTime(actual);
        expected = msgBuilderUtil.formatDateTime(expected);
    } else if ((err.isStrings || err.diffType && err.diffType.isStrings) && expected.length > msgBuilderUtil.EMPTY_STRING_LENGTH && actual.length > msgBuilderUtil.EMPTY_STRING_LENGTH) {
        var stringOutputOffset = 0, diffIndex = 0;
        if (err.isArrays) {
            stringOutputOffset = arrayIndexStr.length;
            if (err.diffType && err.diffType.isStrings) diffIndex = err.diffType.diffIndex + 1;
        } else diffIndex = err.key + 1;
        var formattedDiff = msgBuilderUtil.formatOverflowDiffString(actual, expected, diffIndex, actualMsgTitle.length + stringOutputOffset, false, stringOutputOffset);
        expected = formattedDiff.expected;
        actual = formattedDiff.actual;
        markerString = formattedDiff.key;
    } else {
        actual = msgBuilderUtil.cutOverflowString(actual);
        expected = msgBuilderUtil.cutOverflowString(expected);
    }
    if (err.isArrays) {
        return util.format("%s failed at step %s: %s\n" + 'Arrays differ at index "%s":\n' + "Expected: %s%s\n" + actualMsgTitle + "%s%s\n" + markerString, messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), err.key, arrayIndexStr, msgBuilderUtil.cutNewLines(expected), arrayIndexStr, msgBuilderUtil.cutNewLines(actual));
    } else if (err.isObjects) {
        return util.format('%s failed at step "%s": %s\n' + 'Objects differ at the "%s" field:\n' + "Expected: %s\n" + actualMsgTitle + "%s\n" + markerString, messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), err.key, msgBuilderUtil.cutNewLines(expected), msgBuilderUtil.cutNewLines(actual));
    } else if (err.isStrings) {
        return util.format('%s failed at step "%s": %s\n' + 'Strings differ at index "%s":\n' + "Expected: %s\n" + actualMsgTitle + "%s\n" + markerString, messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), err.key, msgBuilderUtil.cutNewLines(expected), msgBuilderUtil.cutNewLines(actual));
    } else {
        return util.format('%s failed at step "%s": %s\n' + "Expected: %s\n" + actualMsgTitle + "%s\n" + markerString, messagePrefix, err.stepName, msgBuilderUtil.cutNewLines(err.relatedSourceCode), msgBuilderUtil.cutNewLines(expected), msgBuilderUtil.cutNewLines(actual));
    }
};