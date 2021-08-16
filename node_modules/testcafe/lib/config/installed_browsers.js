var async = require("async"), child_process = require("child_process"), fs = require("fs"), os = require("os");

function getBrowserCmd(browserName) {
    if (checkBrowserName(browserName, [ "firefox", "mozilla" ])) return "-new-window"; else if (checkBrowserName(browserName, [ "chrome" ])) return "--new-window"; else if (checkBrowserName(browserName, [ "opera" ])) return "-newwindow"; else return "";
}

function getBrowserIcon(browserName) {
    if (checkBrowserName(browserName, [ "firefox", "mozilla" ])) return "ff"; else if (checkBrowserName(browserName, [ "ie", "internet explorer", "edge" ])) return "ie"; else if (checkBrowserName(browserName, [ "chrome" ])) return "chrome"; else if (checkBrowserName(browserName, [ "opera" ])) return "opera"; else if (checkBrowserName(browserName, [ "safari" ])) return "safari"; else if (checkBrowserName(browserName, [ "chromium" ])) return "chromium"; else return "";
}

function getReadableBrowserName(browserName) {
    if (checkBrowserName(browserName, [ "firefox", "mozilla" ])) return "Mozilla Firefox"; else if (checkBrowserName(browserName, [ "ie", "internet explorer" ])) return "Internet Explorer"; else if (checkBrowserName(browserName, [ "edge" ])) return "Microsoft Edge"; else return browserName;
}

function checkBrowserName(name, expected) {
    for (var i = 0; i < expected.length; i++) {
        if (name.toLowerCase().indexOf(expected[i]) !== -1) return true;
    }
    return false;
}

function getMicrosoftEdgeBrowserPath(callback) {
    child_process.exec("reg query HKCU\\Software\\Classes\\ActivatableClasses /s /f MicrosoftEdge /k", function(error) {
        if (!error) callback("start microsoft-edge:"); else callback(null);
    });
}

function getWindowsBrowsers(callback) {
    var browsersRegKey = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Clients\\StartMenuInternet\\", browsersRegExKey = browsersRegKey.replace(/\\/g, "\\\\"), browsersRegExp = new RegExp(browsersRegExKey + "([^\\\\]+)\\\\shell\\\\open\\\\command\\s+\\([^)]+\\)\\s+reg_sz\\s+([^\n]+)\n", "gi");
    child_process.exec("chcp 65001 | reg query " + browsersRegKey + " /s", function(error, stdout) {
        var brNameMatches = null, browsers = {};
        async.whilst(function() {
            return (brNameMatches = browsersRegExp.exec(stdout)) !== null;
        }, function(cb) {
            var browserName = brNameMatches[1].replace(/\.exe/gi, ""), browserPath = brNameMatches[2].replace(/"/g, "").replace(/\\$/, "").replace(/\s*$/, "");
            fs.exists(browserPath, function(isExists) {
                if (isExists) browsers[getReadableBrowserName(browserName)] = {
                    path: browserPath,
                    cmd: getBrowserCmd(browserName),
                    icon: getBrowserIcon(browserName)
                };
                cb();
            });
        }, function() {
            getMicrosoftEdgeBrowserPath(function(edgePath) {
                if (edgePath) {
                    var msEdgeName = "edge";
                    browsers[getReadableBrowserName(msEdgeName)] = {
                        path: edgePath,
                        cmd: getBrowserCmd(msEdgeName),
                        icon: getBrowserIcon(msEdgeName)
                    };
                }
                callback(browsers);
            });
        });
    });
}

function getMacBrowsers(callback) {
    child_process.exec('ls "/Applications/" | grep -E "Chrome|Firefox|Opera|Safari|Chromium" | sed -E "s/ /032/"', function(error, stdout) {
        var browsers = {}, foundBrowsers = stdout.split("\n");
        for (var i = 0; i < foundBrowsers.length; i++) {
            if (foundBrowsers[i]) {
                var appFileName = foundBrowsers[i].replace(/032/g, " "), browserName = appFileName.replace(/.app$/, ""), browserPath = "/Applications/" + appFileName;
                browsers[getReadableBrowserName(browserName)] = {
                    path: browserPath,
                    cmd: getBrowserCmd(browserName),
                    icon: getBrowserIcon(browserName)
                };
            }
        }
        callback(browsers);
    });
}

function getLinuxBrowsers(callback) {
    child_process.exec("update-alternatives --list x-www-browser", function(error, stdout) {
        var browsers = {}, paths = stdout.split("\n");
        for (var i = 0; i < paths.length; i++) {
            if (paths[i]) {
                var browserName = paths[i].replace(/.*\/([^\/]+)$/g, "$1");
                browsers[getReadableBrowserName(browserName)] = {
                    path: paths[i],
                    cmd: getBrowserCmd(browserName),
                    icon: getBrowserIcon(browserName)
                };
            }
        }
        callback(browsers);
    });
}

exports.get = function(callback) {
    var platform = os.platform();
    if (platform.match(/^win/)) getWindowsBrowsers(callback); else if (platform === "darwin") getMacBrowsers(callback); else getLinuxBrowsers(callback);
};