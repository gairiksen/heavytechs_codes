var async = require("async"), fs = require("fs"), mime = require("mime"), path = require("path"), SharedConst = require("./shared/const");

function createDefaultDir(workingDir, callback) {
    var dirPath = path.resolve(workingDir, SharedConst.UPLOADED_FILES_PATH);
    fs.exists(dirPath, function(exists) {
        if (exists) callback(); else fs.mkdir(dirPath, callback);
    });
}

function getFilePath(workingDir, fileName) {
    return path.resolve(workingDir, fileName);
}

function loadFile(filePath, callback) {
    readFileContent(filePath, function(data, readError) {
        if (!readError) {
            fs.stat(filePath, function(err, stats) {
                if (err) err.filePath = filePath;
                callback({
                    data: data.toString("base64"),
                    info: {
                        lastModifiedDate: stats.mtime,
                        name: path.basename(filePath),
                        type: mime.lookup(filePath)
                    }
                }, err);
            });
        } else callback(null, readError);
    });
}

function readFileContent(filePath, callback) {
    fs.readFile(filePath, function(err, data) {
        if (err) err.filePath = filePath;
        callback(data, err);
    });
}

function saveFile(filePath, data, callback) {
    fs.writeFile(filePath, new Buffer(data, "base64"), function(err) {
        if (err) err.filePath = filePath;
        callback(err);
    });
}

exports.getFiles = function(filePaths, workingDir, callback) {
    var files = [];
    var loadTasks = filePaths.map(function(filePath) {
        return function(callback) {
            var resolvedFilePath = getFilePath(workingDir, filePath);
            if (resolvedFilePath) {
                loadFile(resolvedFilePath, function(result, err) {
                    files.push(err || result);
                    callback();
                });
            } else callback({
                err: {
                    filePath: resolvedFilePath
                }
            });
        };
    });
    async.series(loadTasks, function() {
        callback(files);
    });
};

exports.saveFiles = function(fileNames, workingDir, data, callback) {
    createDefaultDir(workingDir, function(err) {
        if (err) callback([ err ]); else {
            var errs = [], loadTasks = fileNames.map(function(fileName) {
                return function(callback) {
                    var resolvedPath = path.resolve(workingDir, SharedConst.UPLOADED_FILES_PATH + fileName);
                    saveFile(resolvedPath, data[fileNames.indexOf(fileName)], function(err) {
                        if (err) errs.push(err);
                        callback();
                    });
                };
            });
            async.series(loadTasks, function() {
                callback(errs);
            });
        }
    });
};