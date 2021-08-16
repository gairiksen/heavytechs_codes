var fs = require("fs"), fsUtil = require("./../fs_util.js"), path = require("path"), util = require("util"), EventEmitter = require("events").EventEmitter, Process = require("child_process"), async = require("async"), TestSuiteFactory = require("./test_suite_factory"), StatusIndication = require("./status_indication"), FixtureCode = require("../fixture_code"), ERR = require("./../server/server_errs");

function validateBasePath(basePath) {
    if (fs.existsSync(basePath)) {
        var stats = fs.statSync(basePath);
        if (!stats.isDirectory()) throw {
            code: ERR.VIRTUAL_FILE_SYSTEM_BASE_PATH_IS_NOT_DIR,
            basePath: VirtualFS.getPlatformDependentPath(basePath)
        };
    } else throw {
        code: ERR.VIRTUAL_FILE_SYSTEM_BASE_PATH_DOESNT_EXISTS,
        basePath: VirtualFS.getPlatformDependentPath(basePath)
    };
}

function preparePath(basePath) {
    return basePath.replace(/\\/g, VirtualFS.PATH_UNIVERSAL_SEPARATOR);
}

function arePathsMatch(path1, path2) {
    for (var i = 0; i < Math.min(path1.length, path2.length); i++) {
        if (path1[i] !== path2[i]) return false;
    }
    return true;
}

function getFixturesByPath(suite, dirPath, childOnly) {
    var fixtures = suite.fixtures, pathFixtures = {};
    Object.keys(fixtures).forEach(function(fixtureUid) {
        var fixture = fixtures[fixtureUid], depthCriteria = childOnly ? fixture.path.length === dirPath.length : fixture.path.length >= dirPath.length;
        if (depthCriteria && arePathsMatch(fixture.path, dirPath)) pathFixtures[fixtureUid] = fixture;
    });
    return pathFixtures;
}

var VirtualFS = module.exports = function(basePath) {
    EventEmitter.call(this);
    this.basePath = null;
    this.requireRebuild = true;
    this.suiteCache = null;
    this.fsWatchers = [];
    this.rebuildDelay = null;
    this.rebuildLock = false;
    this.renameDuplicateLock = false;
    this.setBasePath(basePath);
};

util.inherits(VirtualFS, EventEmitter);

VirtualFS.StatusIndication = new StatusIndication();

VirtualFS.PATH_EXISTS = "PATH_EXISTS";

VirtualFS.PATH_NOT_EXISTS = "PATH_NOT_EXISTS";

VirtualFS.PATH_NOT_EXISTS_IN_VIRTUAL_FS = "PATH_NOT_EXISTS_IN_VIRTUAL_FS";

VirtualFS.REBUILD_TIMEOUT = 1e3;

VirtualFS.PATH_UNIVERSAL_SEPARATOR = "/";

VirtualFS.WIN_PLATFORM = process.platform === "win32" || process.platform === "win64";

VirtualFS.MAC_PLATFORM = process.platform === "darwin";

VirtualFS.GET_LOCAL_DRIVES_CMD = "wmic logicaldisk get name, description";

VirtualFS.GET_LOCAL_DRIVES_DESC = "Local Fixed Disk";

VirtualFS.CMD_OUTPUT_NEWLINE_CHARACTER = "\r\r\n";

VirtualFS.CFG_FILE_PATH = path.join(__dirname, "../../testcafe_config.json");

VirtualFS.FIXTURE_NAME_COUNTER_PATTERN = /([0-9]*)\)$/;

VirtualFS.getTestUidsByPath = function(suite, dirPath) {
    var testUids = [], fixtures = getFixturesByPath(suite, dirPath, false);
    Object.keys(fixtures).forEach(function(fixtureUid) {
        testUids = testUids.concat(fixtures[fixtureUid].tests);
    });
    return testUids;
};

VirtualFS.getPlatformDependentPath = function(universalPath) {
    return universalPath.replace(new RegExp(VirtualFS.PATH_UNIVERSAL_SEPARATOR, "g"), path.sep);
};

VirtualFS.prototype.getFixtureUidByName = function(fixture, suite) {
    var fixtureUid = "";
    Object.keys(suite.fixtures).forEach(function(uid) {
        var currFixture = suite.fixtures[uid].path.concat(suite.fixtures[uid].name).join(VirtualFS.PATH_UNIVERSAL_SEPARATOR);
        if (currFixture === fixture) fixtureUid = uid;
    });
    return fixtureUid;
};

VirtualFS.prototype.getTestUidByName = function(test, suite) {
    var testUid = "";
    Object.keys(suite.tests).forEach(function(uid) {
        var currTest = suite.tests[uid], testFixture = suite.fixtures[currTest.fixtureUid], testPath = testFixture.path.concat(testFixture.name);
        var currTestPath = testPath.concat(suite.tests[uid].name).join(VirtualFS.PATH_UNIVERSAL_SEPARATOR);
        if (currTestPath === test) testUid = uid;
    });
    return testUid;
};

VirtualFS.prototype.getIncrementedFixtureName = function(name) {
    var numberMatch = name.match(VirtualFS.FIXTURE_NAME_COUNTER_PATTERN);
    if (numberMatch) return name.replace(VirtualFS.FIXTURE_NAME_COUNTER_PATTERN, parseInt(numberMatch[1]) + 1 + ")"); else return name + " (2)";
};

VirtualFS.prototype.setBasePath = function(basePath) {
    var newBasePath = preparePath(basePath);
    validateBasePath(newBasePath);
    this.basePath = newBasePath;
};

VirtualFS.prototype.watchRevisionChanges = function() {
    var vfs = this;
    if (!vfs.rebuildDelay) {
        vfs.rebuildDelay = setTimeout(function() {
            vfs.rebuildDelay = null;
            vfs.requireRebuild = true;
            vfs.emit("suiteChanged");
        }, VirtualFS.REBUILD_TIMEOUT);
    }
};

VirtualFS.prototype.getSuite = function(callback) {
    var vfs = this;
    if (vfs.requireRebuild && !vfs.rebuildLock) {
        vfs.removeFSWatchers();
        vfs.rebuildLock = true;
        vfs.emit("suiteStartBuild");
        TestSuiteFactory.createSuite(this.basePath, function(suite) {
            vfs.renameDuplicates(suite, function(suite) {
                vfs.suiteCache = suite;
                vfs.requireRebuild = false;
                vfs.rebuildLock = false;
                vfs.emit("suiteBuild");
                callback(suite);
            });
        }, function(dirPath, isDir) {
            if (isDir || process.platform === "darwin") vfs._setupFSWatchers(dirPath);
        });
    } else if (vfs.rebuildLock) {
        vfs.on("suiteBuild", function listener() {
            callback(vfs.suiteCache);
            vfs.removeListener("suiteBuild", listener);
        });
    } else {
        if (vfs.suiteCache) callback(vfs.suiteCache); else {
            vfs.on("suiteBuild", function listener() {
                callback(vfs.suiteCache);
                vfs.removeListener("suiteBuild", listener);
            });
        }
    }
};

VirtualFS.prototype._setupFSWatchers = function(dirPath) {
    try {
        var vfs = this, fsWatcher = fs.watch(dirPath, function() {
            fs.exists(vfs.basePath, function(exists) {
                if (!exists) vfs.emit("projectRemoved"); else vfs.watchRevisionChanges();
            });
        });
        vfs.fsWatchers.push(fsWatcher);
        fsWatcher.on("error", function() {
            vfs.fsWatchers.splice(vfs.fsWatchers.indexOf(fsWatcher), 1);
            fsWatcher.close();
        });
    } catch (e) {
        if (e.code !== "EPERM" || !VirtualFS.WIN_PLATFORM) throw e;
    }
};

VirtualFS.prototype.forceBuild = function(callback) {
    var vfs = this;
    TestSuiteFactory.createSuite(vfs.basePath, function(suite) {
        vfs.renameDuplicates(suite, function(suite) {
            vfs.suiteCache = suite;
            vfs.requireRebuild = false;
            vfs.rebuildLock = false;
            vfs.emit("suiteChanged");
            callback(suite);
        });
    }, function(dirPath) {
        vfs._setupFSWatchers(dirPath);
    });
};

VirtualFS.prototype.removeFSWatchers = function() {
    this.fsWatchers.forEach(function(fsWatcher) {
        fsWatcher.close();
    });
    this.fsWatchers = [];
};

VirtualFS.prototype.getPathInfo = function(dirPath, callback) {
    var vfs = this, fsPath = path.join(vfs.basePath, dirPath.join(path.sep));
    var getInfoFromSuite = function() {
        vfs.getSuite(function(suite) {
            var info = {}, childFixtures = getFixturesByPath(suite, dirPath, true);
            info.buildErrs = suite.buildErrs.length ? suite.buildErrs : null;
            info.fixtures = [];
            Object.keys(childFixtures).forEach(function(fixtureUid) {
                var fixture = childFixtures[fixtureUid], fixtureInfo = {
                    uid: fixtureUid,
                    name: fixture.name,
                    fileName: fixture.fileName,
                    page: fixture.page,
                    username: fixture.authCredentials ? fixture.authCredentials.username : null,
                    password: fixture.authCredentials ? fixture.authCredentials.password : null,
                    tests: []
                };
                for (var i = 0; i < fixture.tests.length; i++) {
                    var testUid = fixture.tests[i], test = suite.tests[testUid];
                    fixtureInfo.tests.push({
                        uid: testUid,
                        name: test.name,
                        group: test.group
                    });
                }
                fixtureInfo.tests.sort(function(test1, test2) {
                    var param1 = test1.group !== test2.group && test1.group || test1.name, param2 = test1.group !== test2.group && test2.group || test2.name;
                    if (param1 > param2) return 1; else if (param1 < param2) return -1; else return 0;
                });
                info.fixtures.push(fixtureInfo);
            });
            vfs.getChildDirsByPath(dirPath, function(dirs) {
                info.dirs = dirs;
                callback(null, info);
            });
        });
    };
    if (!dirPath.length) getInfoFromSuite(); else {
        vfs._pathExists(fsPath, function(errs) {
            if (errs !== VirtualFS.PATH_EXISTS) callback(errs, null); else getInfoFromSuite();
        });
    }
};

VirtualFS.prototype._validateAbsolutePath = function(fsPath) {
    var result = true;
    fsPath = fsPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR).split(VirtualFS.PATH_UNIVERSAL_SEPARATOR);
    Object.keys(fsPath).forEach(function(elm) {
        if (fsPath[elm] === "." || fsPath[elm] === "..") result = false;
    });
    return result;
};

VirtualFS.prototype.pathExists = function(fsPath, callback) {
    this._pathExists(fsPath, function(res) {
        callback(res === VirtualFS.PATH_EXISTS);
    });
};

VirtualFS.prototype._pathExists = function(fsPath, callback) {
    var vfs = this;
    vfs.getSuite(function(suite) {
        fs.stat(fsPath, function(fsPathErr, stats) {
            if (fsPathErr) callback(VirtualFS.PATH_NOT_EXISTS); else {
                var fixtures = suite.fixtures, fixturesUids = Object.keys(fixtures);
                for (var i = 0; i < fixturesUids.length; i++) {
                    var fixtureUid = fixturesUids[i], vfsPath = fixtures[fixtureUid].path.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), fixtureDirPath = path.join(vfs.basePath, vfsPath), fixtureFilePath = path.join(vfs.basePath, vfsPath, fixtures[fixtureUid].fileName);
                    if (fsPath === fixtureDirPath || !fixtureDirPath.indexOf(fsPath + path.sep) || fsPath === fixtureFilePath) {
                        callback(VirtualFS.PATH_EXISTS);
                        return;
                    }
                }
                if (stats.isDirectory()) fs.stat(path.join(fsPath, TestSuiteFactory.CFG_FILE_NAME), function(testConfigErr) {
                    callback(testConfigErr ? VirtualFS.PATH_NOT_EXISTS_IN_VIRTUAL_FS : VirtualFS.PATH_EXISTS);
                }); else callback(VirtualFS.PATH_NOT_EXISTS_IN_VIRTUAL_FS);
            }
        });
    });
};

VirtualFS.prototype._createDirWithTestConfig = function(dirPath, name, callback) {
    fs.mkdir(dirPath, 493, function(err) {
        if (err) callback({
            code: ERR.VIRTUAL_FILE_SYSTEM_CREATE_DIR_FAILED,
            dirPath: name
        }); else fs.writeFile(path.join(dirPath, TestSuiteFactory.CFG_FILE_NAME), "{}", callback);
    });
};

VirtualFS.prototype.createDir = function(createPath, name, callback) {
    var vfs = this, dirPath = path.join(vfs.basePath, createPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), name);
    if (!vfs._validateAbsolutePath(createPath)) {
        callback({
            code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_DIR_PATH,
            dirPath: name
        });
        return;
    }
    vfs._pathExists(dirPath, function(res) {
        if (res !== VirtualFS.PATH_NOT_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_DIR_ALREADY_EXISTS,
                dirPath: name
            });
            return;
        }
        vfs.removeFSWatchers();
        vfs._createDirWithTestConfig(dirPath, name, function(err) {
            vfs.forceBuild(function() {
                callback(err ? {
                    code: ERR.VIRTUAL_FILE_SYSTEM_CREATE_DIR_FAILED,
                    dirPath: name
                } : null);
            });
        });
    });
};

VirtualFS.prototype.createProject = function(createPath, name, callback) {
    var vfs = this, dirPath = path.join(createPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), name);
    if (!vfs._validateAbsolutePath(createPath)) callback({
        code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_DIR_PATH,
        dirPath: name
    }); else {
        var testConfigPath = path.join(dirPath, TestSuiteFactory.CFG_FILE_NAME);
        fs.exists(dirPath, function(exists) {
            if (exists) fs.exists(testConfigPath, function(exists) {
                if (exists) vfs.changeTestsDir(dirPath, callback); else fs.writeFile(testConfigPath, "{}", function(err) {
                    if (!err) vfs.changeTestsDir(dirPath, callback); else callback({
                        code: ERR.VIRTUAL_FILE_SYSTEM_CREATE_DIR_FAILED,
                        dirPath: name
                    });
                });
            }); else vfs._createDirWithTestConfig(dirPath, name, function(err) {
                if (!err) vfs.changeTestsDir(dirPath, callback); else callback({
                    code: ERR.VIRTUAL_FILE_SYSTEM_CREATE_DIR_FAILED,
                    dirPath: name
                });
            });
        });
    }
};

VirtualFS.prototype.renameDir = function(dirPath, newName, callback) {
    var vfs = this, oldPath = path.join(vfs.basePath, dirPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR)), oldName = dirPath[dirPath.length - 1];
    if (!vfs._validateAbsolutePath(dirPath)) {
        callback({
            code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_DIR_PATH,
            dirPath: oldName
        });
        return;
    }
    vfs._pathExists(oldPath, function(res) {
        if (res !== VirtualFS.PATH_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_DIR_DOESNT_EXIST,
                dirPath: oldName
            });
            return;
        }
        dirPath[dirPath.length - 1] = newName;
        var newPath = path.join(vfs.basePath, dirPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR));
        if (!vfs._validateAbsolutePath(dirPath)) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_DIR_PATH,
                dirPath: newName
            });
            return;
        }
        vfs._pathExists(newPath, function(res) {
            if (res !== VirtualFS.PATH_NOT_EXISTS) {
                callback({
                    code: ERR.VIRTUAL_FILE_SYSTEM_DIR_ALREADY_EXISTS,
                    dirPath: newName
                });
                return;
            }
            vfs.removeFSWatchers();
            fs.rename(oldPath, newPath, function(err) {
                vfs.forceBuild(function() {
                    callback(err ? {
                        code: ERR.VIRTUAL_FILE_SYSTEM_RENAME_DIR_FAILED,
                        dirPath: oldName
                    } : null);
                });
            });
        });
    });
};

VirtualFS.prototype.deleteDir = function(dirPath, deleteDirCallback) {
    var vfs = this, deletePath = path.join(vfs.basePath, dirPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR)), dirName = deletePath[deletePath.length - 1];
    if (!vfs._validateAbsolutePath(dirPath)) {
        deleteDirCallback({
            code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_DIR_PATH,
            dirPath: dirName
        });
        return;
    }
    fsUtil.getFSListRecursive(deletePath, function(fsListErr, fsList) {
        if (!fsListErr) {
            vfs.removeFSWatchers();
            fsUtil.removeFSList(fsList, function(removeErr, elmName) {
                vfs.forceBuild(function() {
                    deleteDirCallback(removeErr ? {
                        code: ERR.VIRTUAL_FILE_SYSTEM_DELETE_DIR_FAILED,
                        dirPath: elmName
                    } : null);
                });
            });
        } else deleteDirCallback({
            code: ERR.VIRTUAL_FILE_SYSTEM_DELETE_DIR_FAILED,
            dirPath: dirName
        });
    });
};

VirtualFS.prototype.editFixture = function(dirPath, oldFilename, newFilename, newName, newPage, newUsername, newPassword, callback) {
    var vfs = this, renamePath = dirPath.slice(0);
    renamePath.push(oldFilename);
    var vfsPath = renamePath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), oldPath = path.join(vfs.basePath, vfsPath);
    if (!vfs._validateAbsolutePath(renamePath)) {
        callback({
            code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_FIXTURE_PATH,
            filePath: vfsPath
        });
        return;
    }
    vfs._pathExists(oldPath, function(res) {
        if (res !== VirtualFS.PATH_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_FIXTURE_FILE_DOESNT_EXIST,
                filePath: vfsPath
            });
            return;
        }
        renamePath[renamePath.length - 1] = newFilename;
        var newVfsPath = renamePath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), newPath = path.join(vfs.basePath, newVfsPath);
        if (!vfs._validateAbsolutePath(renamePath)) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_FIXTURE_PATH,
                filePath: newVfsPath
            });
            return;
        }
        vfs.removeFSWatchers();
        var updateFixtureCode = function() {
            var directives = {
                fixture: newName,
                page: newPage,
                auth: newUsername ? newUsername + ":" + newPassword : null
            };
            FixtureCode.CodeGenerator.editDirectives(newPath, directives, function(err) {
                vfs.forceBuild(function() {
                    callback(err);
                });
            });
        };
        if (oldPath === newPath) updateFixtureCode(); else {
            vfs._pathExists(newPath, function(res) {
                if (res !== VirtualFS.PATH_NOT_EXISTS) callback({
                    code: ERR.VIRTUAL_FILE_SYSTEM_FIXTURE_FILE_ALREADY_EXISTS,
                    filePath: newVfsPath
                }); else {
                    fs.rename(oldPath, newPath, function(err) {
                        if (err) callback({
                            code: ERR.VIRTUAL_FILE_SYSTEM_RENAME_FIXTURE_FILE_FAILED,
                            filePath: oldPath
                        }); else updateFixtureCode();
                    });
                }
            });
        }
    });
};

VirtualFS.prototype.deleteFixture = function(dirPath, fixtureFilename, callback) {
    var vfs = this, filePathArray = dirPath.slice(0), filePath = path.join(vfs.basePath, dirPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), fixtureFilename);
    filePathArray.push(fixtureFilename);
    if (!vfs._validateAbsolutePath(filePathArray)) {
        callback({
            code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_FIXTURE_PATH,
            filePath: filePath
        });
        return;
    }
    vfs._pathExists(filePath, function(res) {
        if (res !== VirtualFS.PATH_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_FIXTURE_FILE_DOESNT_EXIST,
                filePath: filePath
            });
            return;
        }
        vfs.removeFSWatchers();
        fs.unlink(filePath, function(err) {
            vfs.forceBuild(function() {
                callback(err ? {
                    code: ERR.VIRTUAL_FILE_SYSTEM_DELETE_FIXTURE_FILE_FAILED,
                    filePath: filePath
                } : null);
            });
        });
    });
};

VirtualFS.prototype.createFixture = function(dirPath, name, filename, page, username, password, callback) {
    var vfs = this, fixturePath = dirPath.slice(0);
    fixturePath.push(filename);
    var filePath = [ path.join(vfs.basePath, fixturePath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR)) ].join("");
    if (!vfs._validateAbsolutePath(fixturePath)) {
        callback({
            code: ERR.VIRTUAL_FILE_SYSTEM_INVALID_FIXTURE_PATH,
            filePath: name
        });
        return;
    }
    vfs._pathExists(filePath, function(res) {
        if (res !== VirtualFS.PATH_NOT_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_FIXTURE_FILE_ALREADY_EXISTS,
                filePath: name
            });
            return;
        }
        vfs.removeFSWatchers();
        FixtureCode.CodeGenerator.createFixture(filePath, name, page, function(err) {
            var codeGenCallback = function(err) {
                vfs.forceBuild(function() {
                    callback(err);
                });
            };
            if (!err && (username || password)) FixtureCode.CodeGenerator.editDirectives(filePath, {
                auth: username + ":" + password
            }, codeGenCallback); else codeGenCallback(err);
        });
    });
};

VirtualFS.prototype.getRealPath = function(filePath, fileName, callback) {
    var vfs = this;
    fs.realpath(path.join(vfs.basePath, filePath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), fileName), function(err, fileName) {
        callback(!err ? fileName : "");
    });
};

VirtualFS.prototype.deleteTest = function(dirPath, filename, testName, callback) {
    var vfs = this;
    filename = path.join(vfs.basePath, dirPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), filename);
    vfs.removeFSWatchers();
    FixtureCode.CodeGenerator.deleteTest(filename, testName, function(res) {
        vfs.forceBuild(function() {
            callback(res);
        });
    });
};

VirtualFS.prototype.renameTest = function(dirPath, filename, oldName, newName, callback) {
    var vfs = this;
    filename = path.join(vfs.basePath, dirPath.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), filename);
    vfs.removeFSWatchers();
    FixtureCode.CodeGenerator.renameTest(filename, oldName, newName, function(res) {
        vfs.forceBuild(function() {
            callback(res);
        });
    });
};

VirtualFS.prototype.getLocalDrives = function(callback) {
    if (VirtualFS.WIN_PLATFORM) Process.exec(VirtualFS.GET_LOCAL_DRIVES_CMD, function(err, stdout) {
        var stdoutLines = stdout.split(VirtualFS.CMD_OUTPUT_NEWLINE_CHARACTER), drives = stdoutLines.splice(1, stdoutLines.length - 3), result = [];
        if (err) err = ERR.VIRTUAL_FILE_SYSTEM_NODEJS_CANT_GET_DRIVE_LIST;
        for (var i = 0, length = drives.length; i < length; i++) {
            if (drives[i].indexOf(VirtualFS.GET_LOCAL_DRIVES_DESC) === -1) continue;
            var driveName = drives[i].replace(VirtualFS.GET_LOCAL_DRIVES_DESC, "").replace(/\s*/g, "") + path.sep;
            result.push({
                text: driveName,
                id: encodeURIComponent(driveName),
                type: "dir"
            });
        }
        callback(err, result);
    }); else callback(null, [ {
        text: VirtualFS.PATH_UNIVERSAL_SEPARATOR,
        id: encodeURIComponent(VirtualFS.PATH_UNIVERSAL_SEPARATOR),
        type: "dir"
    } ]);
};

VirtualFS._isPlatformExecutionFile = function(filename) {
    if (VirtualFS.WIN_PLATFORM) return /.exe$/.test(filename) ? true : false; else if (VirtualFS.MAC_PLATFORM) return /.app$/.test(filename) ? true : false;
    return true;
};

VirtualFS.prototype.getFileStructureByPath = function(fsPath, showPlatformExecFiles, callback) {
    var files = [];
    fsPath = VirtualFS.getPlatformDependentPath(fsPath);
    fs.readdir(fsPath, function(err, items) {
        if (err) err = {
            code: ERR.VIRTUAL_FILE_SYSTEM_DIR_DOESNT_READ,
            fsPath: fsPath
        };
        if (items) async.forEachSeries(items, function(elm, elmListCallback) {
            var elmPath = path.join(fsPath, elm);
            fs.stat(elmPath, function(err, stats) {
                if (!err) {
                    if (showPlatformExecFiles && stats.isFile() && VirtualFS._isPlatformExecutionFile(elm)) {
                        files.push({
                            text: elm,
                            id: encodeURIComponent(elmPath),
                            type: "file"
                        });
                        elmListCallback();
                    } else if (stats.isDirectory()) {
                        fs.exists(path.join(elmPath, TestSuiteFactory.CFG_FILE_NAME), function(exists) {
                            var fsItem = {
                                text: elm,
                                id: encodeURIComponent(elmPath),
                                type: "dir"
                            };
                            if (exists) fsItem.isProjectDir = true;
                            files.push(fsItem);
                            elmListCallback();
                        });
                    } else elmListCallback();
                } else elmListCallback();
            });
        }, function() {
            callback(err, files);
        }); else callback(err, files);
    });
};

VirtualFS.prototype.changeTestsDir = function(fsPath, callback) {
    var vfs = this, basePath = vfs.basePath, dirNotExistsErr = {
        code: ERR.VIRTUAL_FILE_SYSTEM_DIR_DOESNT_READ,
        fsPath: fsPath
    };
    vfs.removeFSWatchers();
    try {
        vfs.setBasePath(fsPath);
    } catch (err) {
        vfs._setupFSWatchers(basePath);
        callback(err && dirNotExistsErr);
        return;
    }
    vfs.suiteCache = null;
    this.forceBuild(function() {
        callback();
    });
};

VirtualFS.prototype.getBasePath = function() {
    return VirtualFS.getPlatformDependentPath(this.basePath);
};

VirtualFS.prototype.getFixtureCode = function(vfsPath, callback) {
    var fixturePath = path.join(this.basePath, vfsPath);
    this._pathExists(fixturePath, function(res) {
        if (res !== VirtualFS.PATH_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_FIXTURE_FILE_DOESNT_EXIST,
                filePath: vfsPath
            });
            return;
        }
        fs.readFile(fixturePath, "utf8", function(err, data) {
            err = err ? {
                code: ERR.VIRTUAL_FILE_SYSTEM_READ_FIXTURE_FAILED,
                filePath: vfsPath
            } : null;
            callback(err, data);
        });
    });
};

VirtualFS.prototype.saveFixtureCode = function(vfsPath, code, callback) {
    var fixturePath = path.join(this.basePath, vfsPath);
    this._pathExists(fixturePath, function(res) {
        if (res !== VirtualFS.PATH_EXISTS) {
            callback({
                code: ERR.VIRTUAL_FILE_SYSTEM_FIXTURE_FILE_DOESNT_EXIST,
                filePath: vfsPath
            });
            return;
        }
        fs.writeFile(fixturePath, code, function(err) {
            callback(err ? {
                code: ERR.VIRTUAL_FILE_SYSTEM_WRITE_FIXTURE_FAILED,
                filePath: vfsPath
            } : null);
        });
    });
};

VirtualFS.prototype.getChildDirsByPath = function(dirPath, callback) {
    var dirs = [], absolutePath = path.join(this.basePath, dirPath.join(path.sep)), vfs = this;
    fs.readdir(absolutePath, function(err, dirContent) {
        if (!err) async.forEachSeries(dirContent, function(elm, elmListCallback) {
            var filePath = path.join(absolutePath, elm);
            fs.stat(filePath, function(err, stats) {
                if (!err && stats.isDirectory()) {
                    vfs._pathExists(filePath, function(res) {
                        if (res === VirtualFS.PATH_EXISTS) dirs.push({
                            name: elm,
                            path: dirPath.concat(elm).join(VirtualFS.PATH_UNIVERSAL_SEPARATOR)
                        });
                        elmListCallback();
                    });
                } else elmListCallback();
            });
        }, function() {
            dirs = dirs.sort(function(d1, d2) {
                if (d1.name === d2.name) return 0;
                return d1.name < d2.name ? -1 : 1;
            });
            callback(dirs);
        }); else callback(dirs);
    });
};

VirtualFS.prototype.renameDuplicates = function(suite, callback) {
    var vfs = this, fixtures = suite.fixtures, sortedFixtures = {}, needRenameList = [];
    if (vfs.renameDuplicateLock) {
        callback(suite);
        return;
    }
    var sortingRule = function(fixture1, fixture2) {
        if (fixture1.name > fixture2.name) return 1; else if (fixture1.name < fixture2.name) return -1; else return 0;
    };
    Object.keys(fixtures).forEach(function(fixtureUid) {
        var fixture = fixtures[fixtureUid], fixturePath = fixture.path.join("/");
        if (!sortedFixtures[fixturePath]) sortedFixtures[fixturePath] = [];
        sortedFixtures[fixturePath].push(fixture);
    });
    Object.keys(sortedFixtures).forEach(function(vfsPath) {
        var fixturesByPath = sortedFixtures[vfsPath];
        fixturesByPath.sort(sortingRule);
        var fixtureNames = fixturesByPath.length && [ fixturesByPath[0].name ];
        for (var i = 1; i < fixturesByPath.length; i++) {
            fixtureNames[i] = fixturesByPath[i].name;
            if (fixtureNames[i] === fixtureNames[i - 1] || fixtureNames[i] === fixtureNames[i - 1].replace(VirtualFS.FIXTURE_NAME_COUNTER_PATTERN, "")) {
                var newName = vfs.getIncrementedFixtureName(fixtureNames[i - 1]);
                needRenameList.push({
                    newName: newName,
                    origFixture: fixturesByPath[i]
                });
                fixtureNames[i] = newName;
            }
        }
    });
    if (needRenameList.length) {
        vfs.removeFSWatchers();
        async.forEachSeries(needRenameList, function(renameFixtureObj, renameCallback) {
            var fixture = renameFixtureObj.origFixture, username = fixture.authCredentials ? fixture.authCredentials.username : "", password = fixture.authCredentials ? fixture.authCredentials.password : "", filePath = path.join(vfs.basePath, fixture.path.join(VirtualFS.PATH_UNIVERSAL_SEPARATOR), fixture.fileName), directives = {
                fixture: renameFixtureObj.newName,
                page: fixture.page,
                auth: username ? username + ":" + password : null
            };
            FixtureCode.CodeGenerator.editDirectives(filePath, directives, function(err) {
                if (err) vfs.renameDuplicateLock = true;
                renameCallback();
            });
        }, function() {
            vfs.forceBuild(function(suite) {
                callback(suite);
            });
        });
    } else callback(suite);
};