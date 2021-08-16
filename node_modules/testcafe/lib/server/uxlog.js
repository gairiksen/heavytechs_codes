var http = require("http"), int64 = require("node-int64"), crc32 = require("buffer-crc32");

function noop() {}

function createTrackingDataPacket(logItem) {
    var part1 = toLE(new int64(logItem.date).buffer), part2 = new Buffer(2);
    part2.writeUInt8(logItem.actionKind, 0);
    part2.writeUInt8(UXLog.PRODUCT_ID, 1);
    var msg = logItem.msg.substr(0, 2048), part3 = new Buffer(4), part4 = new Buffer(2), part5 = new Buffer(msg, "binary");
    part3.writeUInt32LE(crc32.unsigned(part5), 0);
    part4.writeInt16LE(msg.length, 0);
    return Buffer.concat([ part1, part2, part3, part4, part5 ]);
}

function toLE(buffer) {
    return [].reverse.call(buffer);
}

var UXLog = module.exports = function(config) {
    this.collectedData = [];
    this.loggingAllowed = false;
    this.version = "";
    this.userID = "";
    this.sendDataInterval = setInterval(this.sendCollectedData.bind(this), UXLog.SEND_DATA_INTERVAL);
    this._getLoggingSettings(config);
};

UXLog.UXLOG_HOSTNAME = "uxlog.devexpress.com";

UXLog.UXLOG_PORT = 80;

UXLog.SEND_DATA_INTERVAL = 5 * 60 * 1e3;

UXLog.SEND_DATA_REQUEST_TIMEOUT = 3e3;

UXLog.PRODUCT_ID = 11;

UXLog.prototype.RECORDER_ACTION_KIND = 100;

UXLog.prototype.CONTROL_PANEL_ACTION_KIND = 101;

UXLog.prototype.FATAL_ERROR_ACTION_KIND = 102;

UXLog.dateStrToWindowsFileTime = function(dateStr) {
    var WINDOWS_TICK = 1e7, SEC_TO_UNIX_EPOCH = 11644473600, unixSec = new Date(dateStr).getTime() / 1e3;
    return (unixSec + SEC_TO_UNIX_EPOCH) * WINDOWS_TICK;
};

UXLog.toVersionIdMinor = function(version) {
    if (version) {
        var parts = version.split(".");
        if (parseInt(parts[2], 10) < 10) parts[2] = "0" + parts[2];
        return parts.join("");
    }
    return version;
};

Object.defineProperties(UXLog.prototype, {
    enabled: {
        get: function() {
            return !!(this.loggingAllowed && this.userID && this.version);
        }
    }
});

UXLog.prototype._getSendDataReqOptions = function(contentLength) {
    return {
        hostname: UXLog.UXLOG_HOSTNAME,
        port: UXLog.UXLOG_PORT,
        path: [ "/?id=", this.userID, "&version=", this.version ].join(""),
        method: "POST",
        headers: {
            "content-type": "app/x-www-form-urlencoded",
            "content-length": contentLength
        }
    };
};

UXLog.prototype._getLoggingSettings = function(config) {
    var uxlog = this;
    config.getLoggingAllowedFlag(function(loggingAllowed) {
        uxlog.loggingAllowed = loggingAllowed;
    });
    config.getUserID(function(userID) {
        uxlog.userID = userID.replace(/-/g, "");
    });
    config.getCurrentVersion(function(version) {
        uxlog.version = UXLog.toVersionIdMinor(version);
    });
};

UXLog.prototype._getBinaryTrackingData = function() {
    return Buffer.concat(this.collectedData.map(createTrackingDataPacket));
};

UXLog.prototype.addEntry = function(actionKind, msg) {
    if (this.enabled) {
        var dateStr = new Date().toUTCString();
        this.collectedData.push({
            date: UXLog.dateStrToWindowsFileTime(dateStr),
            msg: msg,
            actionKind: actionKind
        });
    }
};

UXLog.prototype.shutDown = function() {
    this.loggingAllowed = false;
    this.collectedData = [];
    clearInterval(this.sendDataInterval);
};

UXLog.prototype.sendCollectedData = function() {
    if (this.collectedData.length) {
        var uxlog = this, data = this._getBinaryTrackingData();
        this.collectedData = [];
        var requestTimeout = setTimeout(function() {
            req.abort();
        }, UXLog.SEND_DATA_REQUEST_TIMEOUT);
        var halt = function() {
            uxlog.shutDown();
            clearTimeout(requestTimeout);
        };
        var req = http.request(this._getSendDataReqOptions(data.length), function(res) {
            clearTimeout(requestTimeout);
            res.on("data", noop);
            res.on("end", noop);
            res.on("error", halt);
        });
        req.on("error", halt);
        req.end(data);
    }
};