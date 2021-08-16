var child_process = require("child_process"), os = require("os");

function isPortFree(port, callback) {
    var platform = os.platform();
    if (platform.match(/^win/)) {
        child_process.exec("netstat -an", function(error, stdout) {
            callback(stdout.indexOf(":" + port) === -1);
        });
    } else if (platform === "darwin") {
        child_process.exec("sudo lsof -i -P | grep :" + port, function(error, stdout) {
            callback(!stdout.length);
        });
    } else {
        child_process.exec("sudo netstat -plnt | grep :" + port, function(error, stdout) {
            callback(!stdout.length);
        });
    }
}

exports.getFree = function(defaultPort, exceptPort, callback) {
    if (defaultPort === exceptPort) defaultPort++;
    isPortFree(defaultPort, function(free) {
        if (free) callback(defaultPort); else {
            exports.getFree(defaultPort + 1, exceptPort, function(port) {
                callback(port);
            });
        }
    });
};

exports.isPortFree = isPortFree;