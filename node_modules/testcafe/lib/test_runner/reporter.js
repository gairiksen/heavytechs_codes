var async = require("async"), util = require("util"), errMsgBuilder = require("./../err_msg_builder"), moment = require("moment"), ejs = require("ejs"), path = require("path"), fs = require("fs"), fsUtil = require("../fs_util"), Zip = require("node-zip"), ERR = require("./../server/server_errs"), EventEmitter = require("events").EventEmitter;

function hasTaskErrors(taskReport) {
    return Object.keys(taskReport.testErrReports).length > 0;
}

function getElapsedTime(startTime) {
    return startTime ? moment().diff(startTime, "seconds") : 0;
}

var Reporter = module.exports = function(reportsPath) {
    EventEmitter.call(this);
    this.reportsPath = reportsPath;
    this.taskReports = this._getReporterStateSync();
};

util.inherits(Reporter, EventEmitter);

Reporter.JUNIT_XML_EJS_PATH = path.join(__dirname, "report_templates", "junit.xml.ejs");

Reporter.NUNIT_XML_EJS_PATH = path.join(__dirname, "report_templates", "nunit.xml.ejs");

Reporter.TIME_FORMAT = "MM/DD/YYYY h:mm:ss A";

Reporter.REPORT_FILENAME = "report.json";

Reporter.SCREENSHOTS_DIR_NAME = "screenshots";

Reporter.SCREENSHOT_THUMBNAILS_DIR_NAME = "thumbnails";

Reporter.SCREENSHOT_THUMBNAILS_WIDTH = 240;

Reporter.SCREENSHOT_THUMBNAILS_HEIGHT = 130;

Reporter.TMP_REPORT_FILE = "tmp.rpt";

Reporter.TMP_ZIP_FILE = "tmp.zip";

Reporter.EXPORT_XML_FILENAME = "report.xml";

Reporter.EXPORT_JSON_FILENAME = "report.json";

Reporter.prototype.getTaskReportByUid = function(taskUid) {
    for (var i = 0; i < this.taskReports.length; i++) {
        if (this.taskReports[i].uid === taskUid) {
            this._updateTaskElapsedTime(this.taskReports[i]);
            return this.taskReports[i];
        }
    }
};

Reporter.prototype.getCompletedTaskReports = function() {
    var reporter = this, res = [];
    this.taskReports.forEach(function(task) {
        if (reporter.isCompletedReport(task)) res.push(task);
    });
    return res;
};

Reporter.prototype.getTaskReportsAndUpdateTime = function() {
    var reporter = this;
    this.taskReports.forEach(function(taskReport) {
        reporter._updateTaskElapsedTime(taskReport);
    });
    return this.taskReports;
};

Reporter.prototype.taskAdded = function(taskUid, name, testCount, workerNames, browserVersions, reportUnstable, runOptions) {
    var taskReport = {
        uid: taskUid,
        name: name,
        status: "pending",
        startedAt: null,
        completedAt: null,
        time: 0,
        workerNames: workerNames,
        browserVersions: browserVersions,
        testCount: testCount,
        failed: 0,
        passed: 0,
        testErrReports: {},
        passedTests: {},
        _screenshots: {},
        _runOptions: runOptions
    };
    if (reportUnstable) taskReport.unstableTests = {};
    this.completedRunsPerTest = {};
    this.taskReports.push(taskReport);
    this.emit("taskUpdated", {
        id: taskUid
    });
};

Reporter.prototype.taskStarted = function(taskUid) {
    var taskReport = this.getTaskReportByUid(taskUid);
    taskReport.startedAt = moment().format(Reporter.TIME_FORMAT);
    if (taskReport.startedAt) taskReport.startedAt = taskReport.startedAt.split(" ");
    taskReport.status = "running";
    this.emit("taskUpdated", {
        id: taskUid
    });
};

Reporter.prototype.taskCompleted = function(taskUid) {
    var taskReport = this.getTaskReportByUid(taskUid);
    taskReport.completedAt = taskReport.startedAt && moment().format(Reporter.TIME_FORMAT);
    if (taskReport.completedAt) {
        taskReport.completedAt = taskReport.completedAt.split(" ");
        taskReport.time = getElapsedTime(moment(taskReport.startedAt.join(" "), Reporter.TIME_FORMAT));
    }
    taskReport.status = hasTaskErrors(taskReport) ? "failed" : "succeeded";
    this.emit("taskUpdated", {
        id: taskUid
    });
};

Reporter.prototype.testRunCompleted = function(testRun) {
    var taskReport = this.getTaskReportByUid(testRun.taskUid), testUid = testRun.test.uid;
    testRun.time = testRun.startTime ? getElapsedTime(moment(testRun.startTime, Reporter.TIME_FORMAT)) : 0;
    taskReport.time = taskReport.startedAt ? getElapsedTime(moment(taskReport.startedAt.join(" "), Reporter.TIME_FORMAT)) : 0;
    if (testRun.errs.length) {
        this._processTestRunErrs(testRun, taskReport, testUid);
        this.emit("taskDetailErrUpdated", {
            id: testRun.taskUid
        });
    }
    if (taskReport.unstableTests && testRun.quarantine.failed && testRun.quarantine.succeeded) this._processQuarantineModeErrs(testRun, taskReport, testUid);
    if (taskReport.testErrReports[testUid]) return;
    if (!this.completedRunsPerTest[testRun.taskUid]) this.completedRunsPerTest[testRun.taskUid] = {};
    this.completedRunsPerTest[testRun.taskUid][testUid] = this.completedRunsPerTest[testRun.taskUid][testUid] || 0;
    if (++this.completedRunsPerTest[testRun.taskUid][testUid] === taskReport.workerNames.length) {
        taskReport.passed++;
        taskReport.passedTests[testRun.test.uid] = {
            fixtureName: testRun.fixture.name,
            fixturePath: testRun.fixture.path.join("/"),
            fixtureFileName: testRun.fixture.fileName,
            name: testRun.test.name,
            time: getElapsedTime(testRun.startTime)
        };
        if (taskReport.passed + taskReport.failed < taskReport.testCount) this.emit("taskUpdated", {
            id: testRun.taskUid
        });
    }
};

Reporter.prototype.removeAllCompletedTaskReports = function() {
    var removedReportUids = [];
    for (var index = 0; index < this.taskReports.length; index++) {
        if (this.isCompletedReport(this.taskReports[index])) {
            removedReportUids.push(this.taskReports[index].uid);
            this.taskReports.splice(index, 1);
            index--;
        }
    }
    return removedReportUids;
};

Reporter.prototype.removeCompletedTaskReport = function(uid) {
    for (var index = 0; index < this.taskReports.length; index++) {
        if (uid === this.taskReports[index].uid && this.isCompletedReport(this.taskReports[index])) {
            this.taskReports.splice(index, 1);
            break;
        }
    }
};

Reporter.prototype._buildReportItem = function(testRun, err) {
    return {
        msg: errMsgBuilder.build(err),
        stepName: err.stepName,
        workerName: testRun.workerName,
        _originalErr: err
    };
};

Reporter.prototype._processQuarantineModeErrs = function(testRun, taskReport, testUid) {
    var reporter = this;
    if (!taskReport.unstableTests[testUid]) {
        taskReport.unstableTests[testUid] = {
            name: testRun.test.name,
            fixtureName: testRun.fixture.name,
            fixturePath: testRun.fixture.path.join("/"),
            fixtureFileName: testRun.fixture.fileName,
            workerNames: [],
            testRun1Errs: [],
            testRun2Errs: [],
            testRun3Errs: [],
            testRun4Errs: [],
            testRun5Errs: []
        };
    }
    taskReport.unstableTests[testUid].workerNames.push(testRun.workerName);
    Object.keys(testRun.quarantine.runErrs).forEach(function(runNumberKey) {
        testRun.quarantine.runErrs[runNumberKey].forEach(function(err) {
            var reportItem = reporter._buildReportItem(testRun, err);
            taskReport.unstableTests[testUid][runNumberKey].push(reportItem);
        });
    });
};

Reporter.prototype.formatTaskReport = function(report, reportFormat, callback) {
    switch (reportFormat) {
      case "junit":
        ejs.renderFile(Reporter.JUNIT_XML_EJS_PATH, {
            suite: report
        }, callback);
        break;

      case "nunit":
        ejs.renderFile(Reporter.NUNIT_XML_EJS_PATH, {
            suite: report
        }, callback);
        break;

      default:
        callback(null, report);
    }
};

Reporter.prototype.saveReport = function(reportPath, report, callback) {
    var savedReport = typeof report === "string" ? report : JSON.stringify(report, null, 4);
    fs.writeFile(reportPath, savedReport, function(err) {
        callback(err ? {
            code: ERR.REPORTER_WRITE_REPORT_FAILED,
            filePath: reportPath
        } : null);
    });
};

Reporter.prototype._processTestRunErrs = function(testRun, taskReport, testUid) {
    var reporter = this;
    if (!taskReport.testErrReports[testUid]) {
        taskReport.testErrReports[testUid] = {
            name: testRun.test.name,
            fixtureName: testRun.fixture.name,
            fixturePath: testRun.fixture.path.join("/"),
            fixtureFileName: testRun.fixture.fileName,
            errs: []
        };
        taskReport.failed++;
        this.emit("taskListTestFailed", {
            id: testRun.taskUid
        });
    }
    taskReport.testErrReports[testUid].time = taskReport.testErrReports[testUid].time ? Math.max(taskReport.testErrReports[testUid].time, testRun.time) : testRun.time;
    testRun.errs.forEach(function(err) {
        var reportItem = reporter._buildReportItem(testRun, err);
        taskReport.testErrReports[testUid].errs.push(reportItem);
    });
};

Reporter.prototype._updateTaskElapsedTime = function(taskReport) {
    if (taskReport.status === "running" && taskReport.startedAt) taskReport.time = getElapsedTime(moment(taskReport.startedAt.join(" "), Reporter.TIME_FORMAT));
};

Reporter.prototype.isCompletedReport = function(taskReport) {
    return taskReport.status === "succeeded" || taskReport.status === "failed";
};

Reporter.prototype._writeReportToFile = function(uid, formattedReport, cb) {
    var reportDir = path.join(this.reportsPath, uid), reportPath = path.join(reportDir, Reporter.REPORT_FILENAME);
    var writeReport = function() {
        fs.writeFile(reportPath, JSON.stringify(formattedReport), "UTF8", cb);
    };
    fs.exists(reportDir, function(exists) {
        if (!exists) {
            fs.mkdir(reportDir, function(err) {
                if (!err) writeReport(); else cb();
            });
        } else writeReport();
    });
};

Reporter.prototype._getReporterStateSync = function() {
    var state = [];
    try {
        var fsItems = fs.readdirSync(this.reportsPath);
        for (var index = 0, length = fsItems.length; index < length; index++) {
            var itemPath = path.join(this.reportsPath, fsItems[index]), itemReportPath = path.join(itemPath, Reporter.REPORT_FILENAME), stats = fs.statSync(itemPath);
            try {
                if (stats.isDirectory() && fs.existsSync(itemReportPath)) state.push(JSON.parse(fs.readFileSync(itemReportPath), "UTF8"));
            } catch (e) {}
        }
    } catch (e) {}
    state.sort(function(param1, param2) {
        var dataTime1 = param1.completedAt ? moment(param1.completedAt.join(" "), Reporter.TIME_FORMAT).valueOf() : "", dataTime2 = param2.completedAt ? moment(param2.completedAt.join(" "), Reporter.TIME_FORMAT).valueOf() : "";
        if (dataTime1 > dataTime2) return 1; else if (dataTime1 < dataTime2) return -1; else return 0;
    });
    return state;
};

Reporter.prototype.removeReportFilesByUids = function(reportUids, cb) {
    var reporter = this;
    async.forEachSeries(reportUids, function(taskUid, elmCb) {
        var reportPath = path.join(reporter.reportsPath, taskUid);
        fs.exists(reportPath, function(exists) {
            if (exists) fsUtil.rmdirRecursive(reportPath, elmCb); else elmCb();
        });
    }, function(err) {
        cb(err);
    });
};

Reporter.prototype.saveCompletedReport = function(uid, formattedReport, cb) {
    this._writeReportToFile(uid, formattedReport, cb);
};

Reporter.prototype.getReportPathByUid = function(taskUid, cb) {
    var reportDir = path.join(this.reportsPath, taskUid);
    fs.exists(reportDir, function(exists) {
        if (!exists) fs.mkdir(reportDir, function() {
            cb(reportDir);
        }); else cb(reportDir);
    });
};

Reporter.prototype.addScreenToReport = function(taskUid, testUid, screenshot) {
    var report = this.getTaskReportByUid(taskUid);
    if (!report._screenshots[testUid]) report._screenshots[testUid] = [];
    report._screenshots[testUid].push(screenshot);
};

Reporter.prototype.zipReport = function(taskId, format, cb) {
    var reporter = this, formattedReport = "", filename = "", screensList = [], zipFile = "", tmpZipPath = path.join(this.reportsPath, Reporter.TMP_ZIP_FILE), tmpReportPath = path.join(this.reportsPath, Reporter.TMP_REPORT_FILE), text = this.getTaskReportByUid(taskId), res = "";
    async.series({
        "format report": function(done) {
            reporter.formatTaskReport(text, format, function(err, report) {
                if (err) {
                    cb(err);
                    done(err);
                } else {
                    var isJSON = typeof report !== "string";
                    formattedReport = isJSON ? JSON.stringify(report, null, 4) : report;
                    filename = isJSON ? Reporter.EXPORT_JSON_FILENAME : Reporter.EXPORT_XML_FILENAME;
                    done();
                }
            });
        },
        "write report to temporary file": function(done) {
            fs.writeFile(tmpReportPath, formattedReport, function(err) {
                if (err) {
                    cb(err);
                    done(err);
                } else done();
            });
        },
        "create temporary zip archive and write report": function(done) {
            zipFile = Zip();
            fs.readFile(tmpReportPath, function(err, data) {
                zipFile.file(filename, data);
                done();
            });
        },
        "get screenshots list": function(done) {
            reporter.getReportPathByUid(taskId, function(fsPath) {
                var screenshotsPath = path.join(fsPath, Reporter.SCREENSHOTS_DIR_NAME);
                fs.exists(screenshotsPath, function(exists) {
                    if (exists) fs.readdir(screenshotsPath, function(err, files) {
                        if (!err) {
                            files.forEach(function(filePath) {
                                if (/\.png$/.test(filePath)) screensList.push(path.join(screenshotsPath, filePath));
                            });
                            done();
                        } else {
                            cb(err);
                            done(err);
                        }
                    }); else done();
                });
            });
        },
        "add screenshots files to archive": function(done) {
            async.forEachSeries(screensList, function(screenFile, eachCb) {
                var screenFileArr = screenFile.split(path.sep);
                fs.stat(screenFile, function(err, stats) {
                    if (err) {
                        cb(err);
                        done(err);
                    } else if (stats.isFile()) {
                        fs.readFile(screenFile, function(err, data) {
                            zipFile.file(path.join(Reporter.SCREENSHOTS_DIR_NAME, screenFileArr[screenFileArr.length - 1]), data);
                            eachCb();
                        });
                    } else eachCb();
                });
            }, done);
        },
        "finalize archive": function(done) {
            var data = zipFile.generate({
                base64: false,
                compression: "DEFLATE"
            });
            fs.writeFile(tmpZipPath, data, "binary", done);
        },
        "remove resources and return zipStr": function(done) {
            fs.readFile(tmpZipPath, function(err, data) {
                if (err) {
                    cb(err);
                    done(err);
                } else {
                    res = data;
                    fs.unlink(tmpZipPath);
                    fs.unlink(tmpReportPath);
                    done();
                }
            });
        }
    }, function() {
        cb(null, res);
    });
};

Reporter.prototype.setReportsPath = function(reportsPath) {
    this.reportsPath = reportsPath;
};

Reporter.prototype.copyScreenshotsToTestTarget = function(originReport, report) {
    Object.keys(originReport._screenshots).forEach(function(key) {
        var screens = originReport._screenshots[key];
        if (report.testErrReports[key]) report.testErrReports[key].screenshots = screens.slice(0); else if (report.passedTests[key]) report.passedTests[key].screenshots = screens.slice(0);
    });
};