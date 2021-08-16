var fs = require("fs"), path = require("path"), url = require("url"), util = require("util"), Crypto = require("crypto"), FixtureCode = require("../fixture_code"), uuid = require("node-uuid"), async = require("async"), revalidator = require("revalidator"), ERR = require("./../server/server_errs");

var FIXTURE_FILE_NAME_PATTERN = /\.test\.js$/, CFG_FILE_NAME = "test_config.json", CFG_SCHEMA = {
    additionalProperties: false,
    properties: {
        baseUrl: {
            required: false,
            type: "string",
            messages: {
                type: ERR.SUITE_CFG_PROPERTY_IS_NOT_STRING
            }
        },
        modules: {
            required: false,
            type: "object",
            patternProperties: {
                "(.*)": {
                    additionalItems: false,
                    type: "array",
                    items: {
                        type: "string",
                        messages: {
                            type: ERR.SUITE_CFG_PROPERTY_IS_NOT_STRING
                        }
                    },
                    messages: {
                        type: ERR.SUITE_CFG_MODULE_IS_NOT_ARRAY
                    }
                }
            },
            messages: {
                type: ERR.SUITE_CFG_INVALID_PROPERTY_FORMAT
            }
        }
    }
};

function parseCfg(cfgData, errs, dirPath, filePath) {
    var cfg = {};
    try {
        cfg = JSON.parse(cfgData.toString().trim());
    } catch (err) {
        errs.push({
            code: ERR.SUITE_CFG_FILE_PARSING_FAILED,
            dirPath: dirPath,
            msg: err
        });
        return cfg;
    }
    var validationResult = revalidator.validate(cfg, CFG_SCHEMA);
    validationResult.errors.forEach(function(err) {
        if (err.attribute === "additionalProperties") err.message = ERR.SUITE_CFG_UNSUPPORTED_PROPERTY;
        if (err.property === "(.*)") err.property = "modules";
        errs.push({
            code: err.message,
            property: err.property,
            cfgPath: filePath
        });
    });
    return errs.length ? {} : cfg;
}

function analyzeFixtureFile(filePath, callback, modules, requiresCache, requireJsMap, sourceIndex) {
    var compiler = new FixtureCode.Compiler(filePath, modules, requiresCache, sourceIndex);
    compiler.compile(function(errs, out) {
        var fixtureUid = uuid.v4(), suite = {
            buildErrs: [],
            fixtures: {},
            tests: {}
        };
        if (!errs) {
            var hash = Crypto.createHash("md5");
            hash.update(out.requireJs);
            var requireJsMapKey = hash.digest("hex");
            if (!requireJsMap[requireJsMapKey]) requireJsMap[requireJsMapKey] = out.requireJs;
            var fixture = suite.fixtures[fixtureUid] = {
                fileName: path.basename(filePath),
                path: [],
                name: out.fixture,
                page: out.page,
                requireJsMapKey: requireJsMapKey,
                remainderJs: out.remainderJs,
                authCredentials: out.authCredentials,
                workingDir: out.workingDir,
                tests: []
            };
            Object.keys(out.testsStepData).forEach(function(testName) {
                var testUid = uuid.v4();
                suite.tests[testUid] = {
                    uid: testUid,
                    fixtureUid: fixtureUid,
                    name: testName,
                    group: out.testGroupMap[testName],
                    stepData: out.testsStepData[testName]
                };
                fixture.tests.push(testUid);
            });
        } else {
            suite.fixtures[fixtureUid] = {
                fileName: path.basename(filePath),
                path: [],
                name: path.basename(filePath),
                page: "",
                requireJsMapKey: null,
                remainderJs: "",
                authCredentials: null,
                tests: []
            };
            if (errs.length) {
                for (var i = 0, length = errs.length; i < length; i++) {
                    var fixtureErr = {
                        fixtureUid: fixtureUid,
                        fixture: suite.fixtures[fixtureUid]
                    };
                    Object.keys(errs[i]).forEach(function(key) {
                        fixtureErr[key] = errs[i][key];
                    });
                    suite.buildErrs.push(fixtureErr);
                }
            } else {
                suite.buildErrs.push({
                    fixtureUid: fixtureUid
                });
            }
        }
        callback(suite);
    });
}

function createFileReaders(fileNames, dirPath, fsWalker, modules, requiresCache, requireJsMap, sourceIndex) {
    var fileReaders = [];
    fileNames.forEach(function(fileName) {
        fileReaders.push(function(asyncCallback) {
            var filePath = path.join(dirPath, fileName);
            fs.stat(filePath, function(statErr, stats) {
                if (statErr) {
                    asyncCallback(null, {
                        buildErrs: [ {
                            code: ERR.SUITE_GET_FILE_STATS_FAILED,
                            filePath: filePath
                        } ]
                    });
                    return;
                }
                if (stats.isDirectory()) {
                    analyzeDir(filePath, function(suite) {
                        asyncCallback(null, suite);
                    }, false, fsWalker, modules, requiresCache, requireJsMap, sourceIndex);
                    return;
                }
                if (FIXTURE_FILE_NAME_PATTERN.test(path.basename(filePath))) {
                    if (fsWalker) fsWalker(filePath, false);
                    analyzeFixtureFile(filePath, function(suite) {
                        asyncCallback(null, suite);
                    }, modules, requiresCache, requireJsMap, sourceIndex);
                } else asyncCallback(null);
            });
        });
    });
    return fileReaders;
}

function analyzeDir(dirPath, callback, root, fsWalker, parentModules, requiresCache, requireJsMap, sourceIndex) {
    var suite = {
        buildErrs: [],
        fixtures: {},
        tests: {}
    };
    var getModules = function(cfg) {
        var modules = {};
        Object.keys(parentModules).forEach(function(pmName) {
            modules[pmName] = parentModules[pmName];
        });
        if (cfg.modules) {
            Object.keys(cfg.modules).forEach(function(mName) {
                var m = cfg.modules[mName];
                if (util.isArray(m)) {
                    var resolvedModule = [];
                    m.forEach(function(filePath) {
                        var resolvedPath = path.resolve(path.join(dirPath, filePath));
                        resolvedModule.push(resolvedPath);
                    });
                    modules[mName] = resolvedModule;
                }
            });
        }
        return modules;
    };
    if (fsWalker) fsWalker(dirPath, true);
    fs.readdir(dirPath, function(readdirErr, fileNames) {
        var cfg = {};
        if (readdirErr) {
            suite.buildErrs.push({
                code: ERR.SUITE_READ_DIR_FAILED,
                dirPath: dirPath
            });
            callback(suite);
            return;
        }
        var filePath = path.join(dirPath, CFG_FILE_NAME);
        fs.readFile(filePath, function(cfgReadErr, cfgData) {
            if (!cfgReadErr) cfg = parseCfg(cfgData, suite.buildErrs, dirPath, filePath); else if (cfgReadErr.code !== "ENOENT") suite.buildErrs.push({
                code: ERR.SUITE_READ_CFG_FILE_FAILED,
                dirPath: dirPath
            });
            var modules = getModules(cfg);
            async.series(createFileReaders(fileNames, dirPath, fsWalker, modules, requiresCache, requireJsMap, sourceIndex), function(asyncErr, readerResults) {
                readerResults.forEach(function(res) {
                    if (!res) return;
                    if (res.buildErrs) suite.buildErrs = suite.buildErrs.concat(res.buildErrs);
                    if (res.fixtures) {
                        Object.keys(res.fixtures).forEach(function(fixtureUid) {
                            var fixture = res.fixtures[fixtureUid];
                            if (cfg.baseUrl) fixture.page = url.resolve(cfg.baseUrl, fixture.page);
                            if (!root) fixture.path.splice(0, 0, path.basename(dirPath));
                            suite.fixtures[fixtureUid] = fixture;
                        });
                    }
                    if (res.tests) {
                        Object.keys(res.tests).forEach(function(testUid) {
                            suite.tests[testUid] = res.tests[testUid];
                        });
                    }
                });
                callback(suite);
            });
        });
    });
}

exports.createSuite = function(path, callback, fsWalker) {
    var requireJsMap = {}, sourceIndex = [];
    analyzeDir(path, function(suite) {
        suite.requireJsMap = requireJsMap;
        suite.sourceIndex = sourceIndex;
        callback(suite);
    }, true, fsWalker, {}, {}, requireJsMap, sourceIndex);
};

exports.CFG_FILE_NAME = CFG_FILE_NAME;