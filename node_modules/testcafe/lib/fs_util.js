var async = require("async"), fs = require("fs"), path = require("path");

var WIN_PLATFORM = /^win/.test(process.platform);

var getFSListRecursive = exports.getFSListRecursive = function(dirPath, cb) {
    var fsList = [ dirPath ];
    var getFSListRecursive = function(deletePath, getTreeCb) {
        var dirContent = null;
        async.series({
            listDir: function(seriesCb) {
                fs.readdir(deletePath, function(readDirErr, list) {
                    dirContent = list;
                    seriesCb(readDirErr);
                });
            },
            fold: function(seriesCb) {
                async.forEachSeries(dirContent, function(elm, elmListCb) {
                    fs.realpath(path.join(deletePath, elm), function(realPathErr, curPath) {
                        if (realPathErr) elmListCb(realPathErr);
                        fs.stat(curPath, function(statErr, fStats) {
                            if (statErr) elmListCb(statErr);
                            fsList.push(curPath);
                            if (fStats.isDirectory()) {
                                getFSListRecursive(curPath, function() {
                                    elmListCb();
                                });
                            } else {
                                elmListCb();
                            }
                        });
                    });
                }, function(err) {
                    seriesCb(err);
                });
            }
        }, function(err) {
            getTreeCb(err);
        });
    };
    getFSListRecursive(dirPath, function(err) {
        cb(err, !err ? fsList : null);
    });
};

var removeFSList = exports.removeFSList = function(fsList, fsListCb) {
    fsList = fsList.reverse();
    async.forEachSeries(fsList, function(elm, elmListCb) {
        fs.stat(elm, function(statErr, fStats) {
            if (statErr) fsListCb(statErr, elm);
            var removeFunc = fStats.isDirectory() ? fs.rmdir : fs.unlink;
            removeFunc(elm, function(removeErr) {
                if (removeErr) fsListCb(removeErr, elm); else elmListCb();
            });
        });
    }, function() {
        fsListCb();
    });
};

exports.rmdirRecursive = function(dirPath, deleteDirCallback) {
    getFSListRecursive(dirPath, function(fsListErr, fsList) {
        if (!fsListErr) {
            removeFSList(fsList, function(removeErr, elmName) {
                deleteDirCallback(removeErr, elmName);
            });
        } else deleteDirCallback(fsListErr, dirPath);
    });
};

var copyDirRecursiveSync = exports.copyDirRecursiveSync = function(from, to) {
    fs.readdirSync(from).forEach(function(fileName) {
        var filePath = path.join(from, fileName), stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            fs.mkdirSync(path.join(to, fileName));
            copyDirRecursiveSync(filePath, path.join(to, fileName));
        } else {
            fs.writeFileSync(path.join(to, fileName), fs.readFileSync(filePath));
        }
    });
};

exports.mkdirRecursiveSync = function(dirPath) {
    var dirPathArr = dirPath.split(path.sep), currentPath = dirPathArr.shift();
    if (!WIN_PLATFORM) currentPath = path.sep + currentPath;
    while (dirPathArr.length) {
        currentPath = path.join(currentPath, dirPathArr.shift());
        if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath);
    }
};