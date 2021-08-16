var moment = require("moment");

var CODE_SYMBOL = "`", DATA_TIME_FORMAT = "ddd MMM DD YYYY hh:mm:ss.SSS [GMT]ZZ", DIFF_MARKER_CLASS = "{:.diff-marker}", STRING_OVERFLOW_MARKER = "...";

exports.EMPTY_STRING_LENGTH = '""'.length;

exports.MAX_STRING_LENGTH = 107;

var wrapMarkerStr = function(str) {
    return [ CODE_SYMBOL, str, CODE_SYMBOL, DIFF_MARKER_CLASS ].join("");
};

var getMarkerStr = function(offset) {
    return [ new Array(offset + 1).join(" "), new Array(2).join("^") ].join("");
};

exports.formatDateTime = function(date) {
    return [ moment(date).format(DATA_TIME_FORMAT), new Date(date).toString().match(/\(.*\)$/)[0] ].join(" ");
};

var cutNewLines = exports.cutNewLines = function(code) {
    return typeof code === "string" ? code.replace(/(\r\n|\n|\r)/gm, "\\n") : code;
};

exports.cutOverflowString = function(str) {
    if (str && str.length > exports.MAX_STRING_LENGTH) return str.substr(0, exports.MAX_STRING_LENGTH - STRING_OVERFLOW_MARKER.length) + STRING_OVERFLOW_MARKER; else return str;
};

exports.formatOverflowDiffString = function(actual, expected, key, markerOffset, markdownMarker, maxStringLengthOffset) {
    var diffPosition = null, maxStringLength = exports.MAX_STRING_LENGTH - maxStringLengthOffset;
    var actualLeftPart = cutNewLines(actual.substr(0, key));
    key += actualLeftPart.length - key;
    actual = actualLeftPart + cutNewLines(actual.substr(key, actual.length));
    expected = cutNewLines(expected);
    var formatLongString = function(originStr, diffIndex) {
        var maxLength = maxStringLength, maxStringOffsetFromMiddle = Math.floor(maxStringLength / 2), str = originStr.substr(1, originStr.length - 2), quote = originStr[0];
        if (str.length <= maxStringLength) {
            if (!diffPosition) diffPosition = diffIndex;
            return originStr;
        } else if (diffIndex < maxStringOffsetFromMiddle) {
            maxLength -= STRING_OVERFLOW_MARKER.length;
            if (!diffPosition) diffPosition = diffIndex;
            return [ quote, str.substr(0, maxLength), STRING_OVERFLOW_MARKER, quote ].join("");
        } else if (str.length - diffIndex - 1 < maxStringOffsetFromMiddle) {
            maxLength -= STRING_OVERFLOW_MARKER.length;
            if (!diffPosition) diffPosition = quote.length + STRING_OVERFLOW_MARKER.length + diffIndex - 1 - (str.length - maxLength);
            return [ quote, STRING_OVERFLOW_MARKER, str.substr(str.length - maxLength, maxLength), quote ].join("");
        } else {
            maxLength -= STRING_OVERFLOW_MARKER.length * 2;
            maxStringOffsetFromMiddle = Math.floor(maxLength / 2);
            if (!diffPosition) diffPosition = quote.length + STRING_OVERFLOW_MARKER.length + maxStringOffsetFromMiddle - 1;
            return [ quote, STRING_OVERFLOW_MARKER, str.substr(diffIndex - maxStringOffsetFromMiddle, maxLength), STRING_OVERFLOW_MARKER, quote ].join("");
        }
    };
    return {
        actual: formatLongString(actual, key),
        expected: formatLongString(expected, key),
        key: markdownMarker ? wrapMarkerStr(getMarkerStr(diffPosition + (markerOffset || 0))) : getMarkerStr(diffPosition + (markerOffset || 0))
    };
};