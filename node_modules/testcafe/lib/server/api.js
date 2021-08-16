var async = require("async"), util = require("util"), EventEmitter = require("events").EventEmitter, path = require("path"), VirtualFS = require("../vfs"), errMsgBuilder = require("../err_msg_builder"), ERR = require("./server_errs");

var Api = exports.Api = function(testRunner, vfs, config, standalone) {
    EventEmitter.call(this);
    this.config = config;
    this.testRunner = testRunner;
    this.vfs = vfs;
    this.standalone = standalone;
    this._setupEvents();
};

util.inherits(Api, EventEmitter);

Api.DIRECTORY_TEST_TEXT = '"%s" directory tests';

Api.FIXTURE_TEST_TEXT = '"%s" fixture tests';

Api.SINGLE_TEST_TEXT = '"%s" single test';

Api.GROUP_TESTS_TEXT = '"%s" tests';

Api.GROUP_TESTS_DEFAULT_NAME = "A Group of Tests";

Api.DIR_TEST_SOURCE = "dir";

Api.FIXTURE_TEST_SOURCE = "fixture";

Api.SINGLE_TEST_SOURCE = "test";

Api.GROUP_TEST_SOURCE = "group";

Api.ROOT_MSG = "Root";

Api.prototype._clonePublicFields = function(obj) {
    var clonePublicFields = function(objFrom) {
        var res = Array.isArray(objFrom) ? [] : {};
        for (var field in objFrom) {
            if (objFrom.hasOwnProperty(field)) {
                if (!/^_/.test(field)) {
                    if (typeof objFrom[field] !== "object" || objFrom[field] === null) res[field] = objFrom[field]; else if (Array.isArray(objFrom[field])) {
                        res[field] = [];
                        res[field] = clonePublicFields(objFrom[field]);
                    } else {
                        res[field] = {};
                        res[field] = clonePublicFields(objFrom[field]);
                    }
                }
            }
        }
        return res;
    };
    return clonePublicFields(obj);
};

Api.prototype._getError = function(err) {
    return this.standalone ? err : errMsgBuilder.build(err);
};

Api.prototype._tryDetectSourceType = function(source, suite, callback) {
    var vfsPath = "", api = this;
    if (Array.isArray(source)) {
        callback(Api.GROUP_TEST_SOURCE);
        return;
    }
    if (suite.tests.hasOwnProperty(source)) {
        callback(Api.SINGLE_TEST_SOURCE);
        return;
    }
    if (suite.fixtures.hasOwnProperty(source)) {
        callback(Api.FIXTURE_TEST_SOURCE);
        return;
    }
    var sourceArr = source.split("/");
    function checkNextPart(sourceArr) {
        var lastPathPart = sourceArr.shift();
        vfsPath = path.join(vfsPath, lastPathPart);
        api.vfs.pathExists(path.join(api.vfs.basePath, vfsPath), function(isExists) {
            if (isExists) {
                if (!sourceArr.length) callback(Api.DIR_TEST_SOURCE); else checkNextPart(sourceArr);
            } else {
                if (!sourceArr.length) callback(Api.FIXTURE_TEST_SOURCE); else callback(Api.SINGLE_TEST_SOURCE);
            }
        });
    }
    checkNextPart(sourceArr);
};

Api.prototype._getTestSource = function(source, sourceType, groupName, suite, callback) {
    var api = this;
    function getTestSourceByType(source, sourceType, getSourceCallback) {
        var testUids = [], taskName = "";
        switch (sourceType) {
          case Api.SINGLE_TEST_SOURCE:
            var testUid = suite.tests.hasOwnProperty(source) ? source : api.vfs.getTestUidByName(source, suite);
            if (testUid) {
                testUids = [ testUid ];
                taskName = util.format(Api.SINGLE_TEST_TEXT, suite.tests[testUid].name);
                getSourceCallback({
                    testUids: testUids,
                    taskName: taskName
                });
            } else {
                getSourceCallback({
                    errs: [ api._getError({
                        code: ERR.API_TESTS_TARGET_NOT_EXIST,
                        source: source
                    }) ]
                });
                return;
            }
            break;

          case Api.FIXTURE_TEST_SOURCE:
            var fixtureUid = suite.fixtures.hasOwnProperty(source) ? source : api.vfs.getFixtureUidByName(source, suite);
            if (fixtureUid) {
                testUids = suite.fixtures[fixtureUid].tests;
                taskName = util.format(Api.FIXTURE_TEST_TEXT, suite.fixtures[fixtureUid].name);
                getSourceCallback({
                    testUids: testUids,
                    taskName: taskName
                });
            } else {
                getSourceCallback({
                    errs: [ api._getError({
                        code: ERR.API_TESTS_TARGET_NOT_EXIST,
                        source: source
                    }) ]
                });
                return;
            }
            break;

          case Api.DIR_TEST_SOURCE:
            var dirPath = source ? source.split("/") : [];
            testUids = VirtualFS.getTestUidsByPath(suite, dirPath);
            taskName = util.format(Api.DIRECTORY_TEST_TEXT, dirPath[dirPath.length - 1] ? dirPath[dirPath.length - 1] : Api.ROOT_MSG);
            getSourceCallback({
                testUids: testUids,
                taskName: taskName
            });
            break;

          case Api.GROUP_TEST_SOURCE:
            var errs = [];
            async.forEachSeries(source, function(elm, itemCallback) {
                api._tryDetectSourceType(elm, suite, function(detectedSourceType) {
                    getTestSourceByType(elm, detectedSourceType, function(item) {
                        testUids = item.testUids ? testUids.concat(item.testUids) : testUids;
                        errs = item.errs ? errs.concat(item.errs) : errs;
                        itemCallback();
                    });
                });
            }, function() {
                getSourceCallback({
                    errs: errs.length ? errs : null,
                    testUids: testUids,
                    taskName: groupName ? util.format(Api.GROUP_TESTS_TEXT, groupName) : Api.GROUP_TESTS_DEFAULT_NAME
                });
            });
            break;

          default:
            getSourceCallback({
                errs: [ api._getError({
                    code: ERR.API_UNKNOWN_FIXTURE_TYPE,
                    type: sourceType
                }) ]
            });
            return;
        }
    }
    if (!sourceType) api._tryDetectSourceType(source, suite, function(sourceType) {
        getTestSourceByType(source, sourceType, callback);
    }); else getTestSourceByType(source, sourceType, callback);
};

Api.prototype._getActualWorkers = function(workers, browsers, taskName, callback) {
    var workerPool = this.testRunner.workerPool, workersList = [], errs = [];
    workers.forEach(function(workerName) {
        if (!workerPool.get(workerName)) errs.push({
            code: ERR.API_TASK_WORKER_DOESNT_EXIST,
            taskName: taskName,
            workerName: workerName
        }); else workersList.push(workerName);
    });
    if (browsers) {
        workerPool.execBrowsersAndCreateWorkers(browsers, function(createErrs, createdWorkerNames) {
            if (createdWorkerNames) workersList = workersList.concat(createdWorkerNames);
            if (createErrs) errs = errs.concat(createErrs);
            callback(errs, workersList);
        });
    } else callback(errs, workersList);
};

Api.prototype._setupEvents = function() {
    var api = this;
    var taskUpdatedHandler = function(taskUid) {
        var originReport = api.testRunner.reporter.getTaskReportByUid(taskUid), formattedReport = api._clonePublicFields(originReport), task = api.testRunner.tasks[taskUid], isCompletedReport = api.testRunner.reporter.isCompletedReport(originReport);
        api.testRunner.reporter.copyScreenshotsToTestTarget(originReport, formattedReport);
        api.testRunner.reporter.formatTaskReport(formattedReport, task.reportFormat, function(err, report) {
            if (isCompletedReport) {
                if (!task.reportPath) api.emit("taskComplete", report); else {
                    api.testRunner.reporter.saveReport(task.reportPath, report, function(err) {
                        if (err) throw errMsgBuilder.build(err);
                        api.emit("taskComplete", report);
                    });
                }
                api.testRunner.reporter.saveCompletedReport(taskUid, originReport, function() {});
            } else api.emit("taskUpdated", report);
        });
    };
    this.testRunner.reporter.on("taskUpdated", function(task) {
        taskUpdatedHandler(task.id);
    });
    this.testRunner.reporter.on("taskDetailErrUpdated", function(task) {
        taskUpdatedHandler(task.id);
    });
    this.testRunner.workerPool.on("workerAdded", function(name) {
        api.emit("workerAdded", name);
    });
    this.testRunner.workerPool.on("workerDisconnected", function(workerName) {
        api.emit("workerDisconnected", workerName);
    });
};

Api.prototype.listConnectedWorkers = function() {
    return this.testRunner.workerPool.listConnectedWorkers();
};

Api.prototype.listAvailableBrowsers = function() {
    return Object.keys(this.config.browsers);
};

Api.prototype.listDirectory = function() {
    var path = null, vfsPath = [], callback = null;
    if (arguments.length === 2) {
        path = arguments[0];
        callback = arguments[1];
    } else callback = arguments[0];
    if (path && path !== "/") vfsPath = path;
    if (typeof vfsPath === "string") {
        vfsPath = VirtualFS.getPlatformDependentPath(vfsPath);
        vfsPath = vfsPath.split(path.sep);
    }
    this.vfs.getPathInfo(vfsPath, function(err, pathInfo) {
        callback(err, pathInfo);
    });
};

Api.prototype.runTests = function(options, callback) {
    var runOptions = {
        source: options.source || null,
        sourceType: options.sourceType || !options.source && "dir",
        workers: options.workers || [],
        browsers: options.browsers || [],
        takeScreenshotOnFails: options.takeScreenshotOnFails || false,
        failOnJsErrors: options.failOnJsErrors === void 0 ? true : options.failOnJsErrors,
        quarantineMode: options.quarantineMode || false,
        reportFormat: options.reportFormat || "json",
        reportPath: options.reportPath || "",
        groupName: options.groupName || "",
        _currentWindowWorker: options._currentWindowWorker
    };
    var api = this, testRunner = this.testRunner, callbackExists = typeof callback === "function";
    if (!runOptions.workers.length && !runOptions.browsers.length) {
        if (callbackExists) callback(ERR.API_NO_WORKERS_SPECIFIED_FOR_TASK, null, null);
        return;
    }
    api.vfs.getSuite(function(suite) {
        api._getTestSource(runOptions.source, runOptions.sourceType, runOptions.groupName, suite, function(testSource) {
            if (testSource.errs) {
                if (callbackExists) callback(testSource.errs, null, null);
            } else {
                var testUids = testSource.testUids, taskName = testSource.taskName, taskUid = null;
                if (testUids.length) {
                    api._getActualWorkers(runOptions.workers, runOptions.browsers, taskName, function(errs, actualWorkers) {
                        if (!errs.length) errs = null;
                        if (actualWorkers.length) {
                            taskUid = testRunner.addTask(taskName, suite, testUids, actualWorkers, runOptions);
                            if (callbackExists) callback(errs, taskUid, actualWorkers);
                        } else if (callbackExists) callback(errs, null, null);
                    });
                } else if (callbackExists) callback([ api._getError({
                    code: ERR.API_NO_TESTS_TO_RUN
                }) ], null, null);
            }
        });
    });
};