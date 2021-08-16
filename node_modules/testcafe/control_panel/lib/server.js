var async = require("async"), fs = require("fs"), path = require("path"), util = require("util"), http = require("http"), EventEmitter = require("events").EventEmitter, express = require("express"), io = require("socket.io"), Errors = require("./errors"), Const = require("./const");

var WIN_PLATFORM = /^win/.test(process.platform), MAC_PLATFORM = process.platform === "darwin";

var Server = module.exports = function(testCafe) {
    EventEmitter.call(this);
    this.app = express();
    this.appServer = http.createServer(this.app);
    this.port = testCafe.config.controlPanelPort;
    this.socketIO = null;
    this.needOpenProject = true;
    this.config = testCafe.config;
    this.errMsgBuilder = testCafe.errMsgBuilder;
    this.vfs = testCafe.vfs;
    this.testRunner = testCafe.testRunner;
    this.api = testCafe;
    this.recorder = testCafe.recorder;
    this.uxlog = testCafe.uxlog;
    this.trialExpired = null;
    this.installTime = -1;
    this.remainingTime = null;
    this.checkUpdateTimeout = null;
    this.checkTrialTimeout = null;
    this.version = null;
    this.app.use(express.bodyParser()).use("/assets", express.static(path.join(__dirname, "../../_compiled_/control_panel"))).use("/ace", express.static(path.join(__dirname, "../../_compiled_/control_panel/ace"))).use("/dx", express.static(path.join(__dirname, "../../_compiled_/control_panel/dx"))).use(express.favicon(path.join(__dirname, "../../_compiled_/control_panel/images/favicon.ico"))).set("view engine", "ejs").set("view options", {
        layout: false
    }).set("views", path.join(__dirname, "../views"));
    var controlPanel = this;
    this.appServer.on("error", function(err) {
        if (err.code === "EADDRINUSE") controlPanel.emit("fatalError", {
            code: Errors.CONTROL_PANEL_PORT_IS_ALREADY_IN_USE,
            port: controlPanel.port
        });
    });
};

util.inherits(Server, EventEmitter);

Server.prototype.start = function() {
    var controlPanel = this;
    this.socketIO = io.listen(this.appServer, {
        log: false
    });
    this.appServer.listen(this.port);
    this.config.getCurrentVersion(function(curVersion) {
        controlPanel.version = {
            curVersion: curVersion,
            newVersion: null
        };
        controlPanel._checkVersion();
        controlPanel._setupSockets();
        controlPanel._setupRoutes();
    });
};

Server.prototype.close = function() {
    if (this.checkTrialTimeout) clearTimeout(this.checkTrialTimeout);
    if (this.checkUpdateTimeout) clearTimeout(this.checkUpdateTimeout);
    this.appServer.close();
};

Server.prototype._checkVersion = function() {
    var controlPanel = this;
    this.config.checkUpdates(function(curVersion, newVersion) {
        controlPanel.version = {
            curVersion: curVersion,
            newVersion: newVersion
        };
    });
    this.checkUpdateTimeout = setTimeout(function() {
        controlPanel._checkVersion.call(controlPanel);
    }, Const.VERSION_CHECK_TIME);
};

Server.prototype._checkTrial = function() {
    var currDate = new Date().getTime(), controlPanel = this;
    this.remainingTime = Const.TRIAL_TIME - (currDate - this.installTime);
    if (this.remainingTime <= 0 || this.remainingTime > Const.TRIAL_TIME) this.trialExpired = true;
    this.checkTrialTimeout = setTimeout(function() {
        controlPanel._checkTrial.call(controlPanel);
    }, Const.TRIAL_CHECK_TIME);
};

Server.prototype._setupRoutes = function() {
    var controlPanel = this, GET = function(route, handler) {
        controlPanel.app.get(route, handler.bind(controlPanel));
    }, POST = function(route, handler) {
        controlPanel.app.post(route, handler.bind(controlPanel));
    }, ALL = function(route, handler) {
        controlPanel.app.all(route, handler.bind(controlPanel));
    };
    GET("/", this._indexPageHandler);
    GET("/*", this._cachingPreventionHandler);
    POST("/*", this._cachingPreventionHandler);
    GET("/workers/", this._workersPageHandler);
    GET("/workers", this._workersPageHandler);
    ALL("/project/*/", this._projectBrowserHandler);
    ALL("/project/*", this._projectBrowserHandler);
    ALL("/project", this._projectBrowserHandler);
    ALL("/tests/*/", this._testsRouterFallback);
    ALL("/tests/*", this._testsRouterFallback);
    ALL("/tests", this._testsRouterFallback);
    POST("/tests_run/", this._runTests);
    POST("/tests_run", this._runTests);
    GET("/worker/add/:name/", this._addWorker);
    GET("/worker/add/:name", this._addWorker);
    GET("/worker/idle/:name/", this._workerIdleHandler);
    GET("/worker/idle/:name", this._workerIdleHandler);
    GET("/worker/list/", this._listWorkers);
    GET("/worker/list", this._listWorkers);
    POST("/worker/heartbeat/", this._workerHeartbeatHandler);
    POST("/worker/heartbeat", this._workerHeartbeatHandler);
    POST("/worker/force-close/", this._forceBrowserWindowClose);
    POST("/worker/force-close", this._forceBrowserWindowClose);
    GET("/results/:taskID/", this._getTaskDetailResults);
    GET("/results/:taskID", this._getTaskDetailResults);
    GET("/results/", this._listTaskResults);
    GET("/results", this._listTaskResults);
    GET("/results_rev/:uid/", this._getTaskReportRevision);
    GET("/results_rev/:uid", this._getTaskReportRevision);
    GET("/tasks/:taskID/", this._tasksRouterFallback);
    GET("/tasks/:taskID", this._tasksRouterFallback);
    GET("/tasks/", this._tasksRouterFallback);
    GET("/tasks", this._tasksRouterFallback);
    GET("/tasks_rev/:uid/", this._tasksRouterFallback);
    GET("/tasks_rev/:uid", this._tasksRouterFallback);
    POST("/clear_results", this._clearTaskResults);
    POST("/clear_results/", this._clearTaskResults);
    POST("/remove_report", this._removeTaskReport);
    POST("/remove_report/", this._removeTaskReport);
    GET("/export_results", this._exportReports);
    GET("/export_results/", this._exportReports);
    GET("/get_screen", this._getScreenshot);
    GET("/get_screen/", this._getScreenshot);
    GET("/to_screen", this._toScreen);
    GET("/to_screen/", this._toScreen);
    POST("/get_fixture_code/", this._getFixtureCode);
    POST("/get_fixture_code", this._getFixtureCode);
    POST("/save_fixture_code/", this._saveFixtureCode);
    POST("/save_fixture_code", this._saveFixtureCode);
    POST("/rename_dir/", this._renameDir);
    POST("/rename_dir", this._renameDir);
    POST("/delete_dir/", this._deleteDir);
    POST("/delete_dir", this._deleteDir);
    POST("/create_fixture/", this._createFixture);
    POST("/create_fixture", this._createFixture);
    POST("/create_dir/", this._createDir);
    POST("/create_dir", this._createDir);
    POST("/edit_fixture/", this._editFixture);
    POST("/edit_fixture", this._editFixture);
    POST("/delete_fixture/", this._deleteFixture);
    POST("/delete_fixture", this._deleteFixture);
    POST("/rename_test/", this._renameTest);
    POST("/rename_test", this._renameTest);
    POST("/delete_test/", this._deleteTest);
    POST("/delete_test", this._deleteTest);
    GET("/dirs_by_path/", this._getDirsByPath);
    GET("/dirs_by_path", this._getDirsByPath);
    POST("/open_project/", this._openProject);
    POST("/open_project", this._openProject);
    POST("/create_project/", this._createProject);
    POST("/create_project", this._createProject);
    POST("/close_project/", this._closeProjectHandler);
    POST("/close_project", this._closeProjectHandler);
    POST("/recording/start/", this._record);
    POST("/recording/start", this._record);
    GET("/options/", this._getOptions);
    GET("/options", this._getOptions);
    GET("/files_by_path/", this._getFilesByPath);
    GET("/files_by_path", this._getFilesByPath);
    POST("/browser/configure/", this._configureBrowsers);
    POST("/browser/configure", this._configureBrowsers);
    POST("/browsers/detect/", this._detectBrowsers);
    POST("/browsers/detect", this._detectBrowsers);
    POST("/network/save/", this._configureNetwork);
    POST("/network/save", this._configureNetwork);
    POST("/reports/configure/", this._configureReports);
    POST("/reports/configure", this._configureReports);
    GET("/check_updates/", this._checkUpdates);
    GET("/check_updates", this._checkUpdates);
    POST("/uxlog/", this._uxlog);
    POST("/uxlog", this._uxlog);
    ALL("*", this._page404Handler);
};

Server.prototype._cachingPreventionHandler = function(req, res, next) {
    var controlPanel = this;
    if (!req.param("thumbnail")) res.set("cache-control", "no-cache, no-store, must-revalidate");
    function trialHandler() {
        if (controlPanel.trialExpired && Const.CLOSED_PAGE_PATTERN.test(req.originalUrl)) res.render("trial_expired"); else next();
    }
    if (controlPanel.installTime < 0) {
        this.config.getInstallDate(function(val) {
            if (val) {
                controlPanel.installTime = val;
                controlPanel._checkTrial();
                trialHandler();
            } else {
                controlPanel.installTime = 0;
                next();
            }
        });
    } else trialHandler();
};

Server.prototype._indexPageHandler = function(req, res) {
    res.statusCode = 301;
    res.setHeader("Location", "/project/");
    res.end();
};

Server.prototype._workersPageHandler = function(req, res) {
    var isUpdateRequest = req.param("workersUpdate"), currentWorker = req.param("worker") || "", workers = this.testRunner.workerPool.getWorkersInfo(), connectedWorkerSuggestionName = this.testRunner.workerPool.getWorkerNameFromUserAgent(req.headers["user-agent"]);
    Object.keys(workers).forEach(function(workerIndex) {
        workers[workerIndex].workerType = workers[workerIndex].connected ? Const.CONNECTED_WORKER_TYPE : Const.AUTO_CREATED_WORKER_TYPE;
    });
    if (!isUpdateRequest) res.render("workers", {
        workers: workers,
        connectedWorkerSuggestionName: connectedWorkerSuggestionName,
        currentWorker: currentWorker,
        hostname: this.config.controlPanelHost,
        remainingTime: this.remainingTime
    }); else res.render("partial/workers_container", {
        workers: workers
    });
};

Server.prototype._getPathInfo = function(urlPath, callback) {
    var vfs = this.vfs, errMsgBuilder = this.errMsgBuilder, vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], projectBrowser = null, fixtureErrs = [], errs = [], isPage404 = false;
    this.api.listDirectory(vfsPath, function(err, pathInfo) {
        if (err && vfsPath.length) {
            isPage404 = true;
        } else {
            if (!err) {
                if (pathInfo.buildErrs) {
                    for (var errIndex = 0, errsLength = pathInfo.buildErrs.length; errIndex < errsLength; errIndex++) {
                        var error = pathInfo.buildErrs[errIndex];
                        if (error.fixtureUid) {
                            if (!error.filename) {
                                fixtureErrs[error.fixtureUid] = [];
                                continue;
                            }
                            var tmpBasePath = vfs.basePath.replace(/\//g, "\\"), errorMsg = {
                                errText: errMsgBuilder.build(error),
                                filename: error.filename.replace(tmpBasePath, "").replace(/\\/g, "/")
                            };
                            if (fixtureErrs.hasOwnProperty(error.fixtureUid)) fixtureErrs[error.fixtureUid].push(errorMsg); else fixtureErrs[error.fixtureUid] = [ errorMsg ];
                            errs.push(errorMsg);
                        } else errs.push(errMsgBuilder.build(error));
                    }
                }
                projectBrowser = {
                    errs: fixtureErrs,
                    currentUrl: urlPath ? encodeURI([ "/project/", urlPath, "/" ].join("")) : "/project/",
                    pathInfo: pathInfo,
                    breadcrumbs: []
                };
                for (var i = 0, url = "/project/"; i < vfsPath.length; i++) {
                    url = encodeURI([ url, vfsPath[i], "/" ].join(""));
                    projectBrowser.breadcrumbs.push({
                        name: vfsPath[i],
                        url: url
                    });
                }
            }
        }
        callback(errs, projectBrowser, isPage404);
    });
};

Server.prototype._testsRouterFallback = function(req, res) {
    res.statusCode = 301;
    res.setHeader("Location", req.url.replace(/^\/tests/, "/project"));
    res.end();
};

Server.prototype._projectBrowserHandler = function(req, res) {
    var controlPanel = this, slide = req.param("slide"), rebuild = req.param("rebuild"), completeRecordingUid = req.param("completeRecordingUid"), expandRowFilename = req.param("expand") || "", openTestTarget = req.param("open") ? decodeURIComponent(req.param("open")) : "", openTestName = req.param("testName") ? decodeURIComponent(req.param("testName")) : "", completedTaskUid = req.param("taskUid") || "", urlPath = req.params[0] || "", vfs = this.vfs, autoDetectProject = "", completedTask = "";
    if (this.needOpenProject && slide) {
        res.render("partial/project_start_page");
        res.status(200);
        return;
    }
    if (completedTaskUid) {
        var taskReport = this.testRunner.reporter.getTaskReportByUid(completedTaskUid);
        if (taskReport) completedTask = {
            taskUid: taskReport.uid,
            status: taskReport.status,
            taskName: taskReport.name,
            passed: taskReport.passed,
            failed: taskReport.failed,
            total: taskReport.testCount
        };
    }
    this._getPathInfo(urlPath, function(errs, projectBrowser, isPage404) {
        var currentProject = vfs.getBasePath(), projectName = currentProject.split(path.sep).pop();
        if (isPage404) {
            if (!openTestTarget) {
                res.status(404);
                res.render("404");
            } else {
                res.status(302);
                res.set("location", "/project/");
                res.end();
            }
            return;
        }
        var projectBrowserData = {
            autoDetectProject: autoDetectProject,
            projectBrowser: projectBrowser,
            currentProject: currentProject,
            projectName: projectName,
            homeDir: controlPanel.config.getHomeDir()
        };
        var sendRenderData = function() {
            if (slide) res.render("partial/project_browser", projectBrowserData); else if (rebuild) {
                projectBrowserData.errMsgs = errs.length ? errs : null;
                res.render("partial/project_revision_container", projectBrowserData);
            } else {
                projectBrowserData.expandRowFilename = expandRowFilename;
                projectBrowserData.openTestTarget = openTestTarget;
                projectBrowserData.openTestName = openTestName;
                projectBrowserData.completedTask = completedTask;
                projectBrowserData.errMsgs = errs.length ? errs : null;
                projectBrowserData.completeRecordingUid = completeRecordingUid;
                projectBrowserData.remainingTime = controlPanel.remainingTime;
                res.render("project", projectBrowserData);
            }
        };
        if (controlPanel.needOpenProject) {
            controlPanel.config.readCfgFile(function(cfg, err) {
                if (!err && (!cfg || cfg && !cfg.testsDir) && !controlPanel.config.initedFromObj) {
                    projectBrowserData.autoDetectProject = controlPanel.config.testsDir;
                    sendRenderData();
                } else {
                    controlPanel.needOpenProject = false;
                    sendRenderData();
                }
            });
        } else sendRenderData();
    });
};

Server.prototype._runTests = function(req, res) {
    var controlPanel = this, opt = req.param("opt"), source = opt.source, workers = opt.workers || [], runTestErrs = [], returnUrl = opt.location || "", returnToReport = opt.returnToReport, browsers = opt.browsers || [], takeScreenshotOnFails = opt.takeScreenshotOnFails !== "false", failOnJsErrors = opt.failOnJsErrors !== "false", sourceType = opt.sourceType, groupName = opt.groupName || "", api = this.api, errMsgBuilder = this.errMsgBuilder, options = {
        sourceType: sourceType,
        source: source,
        workers: workers,
        browsers: browsers,
        takeScreenshotOnFails: takeScreenshotOnFails,
        failOnJsErrors: failOnJsErrors,
        groupName: groupName
    }, onTaskStarted = null;
    if (Array.isArray(options.source)) options.source.forEach(function(elm) {
        options.source[elm] = decodeURI(options.source[elm]);
    }); else options.source = decodeURI(options.source);
    if (!workers.length && !browsers.length) {
        var workerName = this.testRunner.workerPool.createWorkerFromControlPanelWindow(returnUrl, req.headers["user-agent"]);
        options.workers.push(workerName);
        options._currentWindowWorker = true;
        onTaskStarted = function(errs, taskUid) {
            if (!errs && returnToReport) controlPanel.testRunner.workerPool.get(workerName).returnUrl = [ "http://", controlPanel.config.controlPanelHost, "/results/", taskUid ].join("");
            res.send({
                workerName: workerName,
                errs: errs ? errMsgBuilder.build(runTestErrs.concat(errs)) : []
            });
        };
    } else {
        onTaskStarted = function(errs, taskUid, workers) {
            var workerList = workers || [], status = "success";
            if (errs) runTestErrs = runTestErrs.concat(errMsgBuilder.build(errs));
            if (runTestErrs.length || !workerList.length) status = workerList.length ? "with-errors" : "fail";
            res.status(200);
            if (status !== "fail") res.send({
                status: status,
                errs: runTestErrs,
                taskUid: taskUid
            }); else res.send({
                status: status,
                errs: runTestErrs
            });
        };
    }
    api.runTests(options, onTaskStarted);
};

Server.prototype._addWorker = function(req, res) {
    var noRedirect = req.param("noRedirect"), autoCreated = req.param("auto_created") || "", createdByQRCode = req.param("create_by_qr_code") || "", name = createdByQRCode ? this.testRunner.workerPool.getWorkerNameFromUserAgent(req.headers["user-agent"]) : req.params.name, location = null, validName = "", err = "";
    try {
        if (!autoCreated) validName = this.testRunner.workerPool.connectWorker(name, req.headers["user-agent"]); else validName = this.testRunner.workerPool.createWorkerInNewBrowserWindow(name, req.headers["user-agent"]);
        location = [ "/worker/idle/", encodeURIComponent(validName) ].join("");
    } catch (e) {
        validName = null;
        err = this.errMsgBuilder.build(e);
    }
    if (err) {
        res.status(403);
        res.send(err);
        return;
    }
    if (noRedirect) res.send(location); else {
        res.status(302);
        res.set("location", location);
        res.end();
    }
};

Server.prototype._workerIdleHandler = function(req, res) {
    var restartTestRun = req.param("restartTestRun"), name = req.params.name;
    if (this.testRunner.workerPool.get(name)) {
        if (restartTestRun) this.testRunner.restartCurrentTestRun(name);
        var workerIsConnected = this.testRunner.workerPool.get(name).connected, workerType = workerIsConnected ? Const.CONNECTED_WORKER : Const.AUTO_CREATED;
        res.render("worker_idle", {
            workerName: name,
            workerType: workerType
        });
    } else {
        res.status(404);
        res.render("404");
    }
};

Server.prototype._workerHeartbeatHandler = function(req, res) {
    var state = this.testRunner.getWorkerStatus(req.param("name"));
    if (state) res.send(state); else {
        res.writeHead(204, {
            "Content-Type": "text/plain"
        });
        res.end();
    }
};

Server.prototype._forceBrowserWindowClose = function(req, res) {
    var targetWindowMark = req.param("targetWindowMark");
    res.end();
    this.testRunner.workerPool.forceBrowserWindowClose(targetWindowMark);
};

Server.prototype._listWorkers = function(req, res) {
    var render = req.param("render"), browsers = this.api.config.browsers || {}, workerNames = this.api.listConnectedWorkers();
    this.config.validateBrowsers(browsers, function(browsers) {
        if (render) res.render("partial/worker_list", {
            workerNames: workerNames,
            browsers: browsers,
            isLinuxPlatform: !WIN_PLATFORM && !MAC_PLATFORM
        }); else res.send(workerNames);
    });
};

Server.prototype._tasksRouterFallback = function(req, res) {
    res.statusCode = 301;
    res.setHeader("Location", req.url.replace(/^\/tasks/, "/results"));
    res.end();
};

Server.prototype._renderMarkdownMsgs = function(taskResults) {
    var buildErr = this.errMsgBuilder.build, markdownMode = true;
    Object.keys(taskResults.testErrReports).forEach(function(testUid) {
        taskResults.testErrReports[testUid].errs.forEach(function(err) {
            if (!err._msgMarkdown) err._msgMarkdown = buildErr(err._originalErr, markdownMode);
        });
    });
};

Server.prototype._getTaskDetailResults = function(req, res) {
    var taskID = req.params.taskID, partial = req.param("partial"), taskResults = this.testRunner.reporter.getTaskReportByUid(taskID);
    if (taskResults) {
        this._renderMarkdownMsgs(taskResults);
        if (partial) res.render("partial/task_results_grid", {
            r: taskResults
        }); else res.render("task_results", {
            r: taskResults,
            remainingTime: this.remainingTime,
            detail: true
        });
    } else {
        res.status(404);
        res.render("404");
    }
};

Server.prototype._listTaskResults = function(req, res) {
    var partial = req.param("partial"), taskResults = this.testRunner.reporter.getTaskReportsAndUpdateTime();
    if (!partial) res.render("task_results", {
        taskResults: taskResults,
        remainingTime: this.remainingTime,
        detail: false
    }); else res.render("partial/task_results_container", {
        taskResults: taskResults
    });
};

Server.prototype._getTaskReportRevision = function(req, res) {
    var taskID = req.params.uid, json = req.param("json"), isDetail = req.param("detail"), taskReport = this.testRunner.reporter.getTaskReportByUid(taskID);
    if (taskReport) {
        this._renderMarkdownMsgs(taskReport);
        if (json) res.send(taskReport); else if (isDetail) res.render("partial/task_results_header", {
            r: taskReport
        }); else res.render("partial/task_results_list_item", {
            r: taskReport
        });
    } else {
        res.status(404);
        res.render("404");
    }
};

Server.prototype._renameDir = function(req, res) {
    var urlPath = req.param("curPath") || "", vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], newName = req.param("newName"), errMsgBuilder = this.errMsgBuilder;
    this.vfs.renameDir(vfsPath, newName, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._deleteDir = function(req, res) {
    var urlPath = req.param("curPath") || "", vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.deleteDir(vfsPath, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._createFixture = function(req, res) {
    var urlPath = req.param("curPath") || "", fixtureName = req.param("fixtureName"), fixturePage = req.param("fixturePage"), filename = req.param("filename"), fixtureUsername = req.param("fixtureUsername"), fixturePassword = req.param("fixturePassword"), vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.createFixture(vfsPath, fixtureName, filename, fixturePage, fixtureUsername, fixturePassword, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._createDir = function(req, res) {
    var urlPath = req.param("curPath") || "", dirName = req.param("dirName"), vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.createDir(vfsPath, dirName, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._editFixture = function(req, res) {
    var urlPath = req.param("curPath") || "", newName = req.param("newName"), newPage = req.param("newPage"), oldFilename = req.param("oldFilename"), newFilename = req.param("newFilename"), newUsername = req.param("newUsername"), newPassword = req.param("newPassword"), vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.editFixture(vfsPath, oldFilename, newFilename, newName, newPage, newUsername, newPassword, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._deleteFixture = function(req, res) {
    var urlPath = req.param("curPath") || "", fixtureFilename = req.param("fixtureFilename"), vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.deleteFixture(vfsPath, fixtureFilename, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._deleteTest = function(req, res) {
    var urlPath = req.param("curPath") || "", filename = req.param("filename"), testName = req.param("testName"), vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.deleteTest(vfsPath, filename, testName, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._renameTest = function(req, res) {
    var urlPath = req.param("curPath") || "", filename = req.param("filename"), oldName = req.param("oldName"), newName = req.param("newName"), vfsPath = urlPath ? decodeURI(urlPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    this.vfs.renameTest(vfsPath, filename, oldName, newName, function(err) {
        if (!err) {
            res.writeHead(204, {
                "Content-Type": "text/plain"
            });
            res.end();
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._record = function(req, res) {
    var returnUrl = req.param("returnUrl"), fixtureUid = req.param("fixtureUid"), errMsgBuilder = this.errMsgBuilder;
    this.recorder.startRecording(fixtureUid, returnUrl, function(err, recordingUrl) {
        if (err) {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        } else res.send(recordingUrl);
    });
};

Server.prototype._getDirsByPath = function(req, res) {
    var fsPath = req.param("path"), errMsgBuilder = this.errMsgBuilder;
    if (fsPath) this.vfs.getFileStructureByPath(decodeURIComponent(fsPath), false, function(err, dirs) {
        res.status(200);
        res.send(dirs);
    }); else this.vfs.getLocalDrives(function(err, devicesList) {
        if (!err) {
            res.status(200);
            res.send(devicesList);
        } else {
            res.status(304);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._getFilesByPath = function(req, res) {
    var fsPath = decodeURIComponent(req.param("path")), errMsgBuilder = this.errMsgBuilder;
    if (fsPath) this.vfs.getFileStructureByPath(fsPath, true, function(err, fs) {
        res.status(200);
        res.send(fs);
    }); else this.vfs.getLocalDrives(function(err, devicesList) {
        if (!err) {
            res.status(200);
            res.send(devicesList);
        } else {
            res.status(304);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._createProject = function(req, res) {
    var projectPath = decodeURIComponent(req.param("projectPath")), name = req.param("name"), controlPanel = this, fsPath = projectPath ? decodeURI(projectPath).split("/") : [], errMsgBuilder = this.errMsgBuilder;
    controlPanel.vfs.createProject(fsPath, name, function(err) {
        if (!err) {
            controlPanel.config.setTestsDir(path.join(projectPath, name), function(err) {
                if (!err) {
                    res.writeHead(200, {
                        "Content-Type": "text/plain"
                    });
                    res.end();
                } else {
                    res.status(403);
                    res.send(errMsgBuilder.build(err));
                }
            });
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._openProject = function(req, res) {
    var fsPath = req.param("example") ? this.config.getDefaultTestsDir() : decodeURIComponent(req.param("projectName")), controlPanel = this, errMsgBuilder = this.errMsgBuilder;
    controlPanel.vfs.changeTestsDir(fsPath, function(err) {
        if (!err) {
            controlPanel.config.setTestsDir(fsPath, function(err) {
                if (!err) {
                    res.status(200);
                    res.send("");
                } else {
                    res.status(403);
                    res.send(errMsgBuilder.build(err));
                }
            });
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._closeProject = function(callback) {
    var controlPanel = this;
    controlPanel.config.setTestsDir("", function(err) {
        controlPanel.vfs.removeFSWatchers();
        callback(err);
    });
};

Server.prototype._closeProjectHandler = function(req, res) {
    var controlPanel = this, errMsgBuilder = this.errMsgBuilder;
    this._closeProject(function(err) {
        if (!err) {
            controlPanel.needOpenProject = true;
            res.status(200);
            res.send("");
        } else {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        }
    });
};

Server.prototype._getOptions = function(req, res) {
    var controlPanel = this, browsers = controlPanel.config.browsers || {}, isControlPanelPortFree = true, isServicePort1Free = true, isServicePort2Free = true, isHostnameAutoDetect = true, isControlPanelPortAutoDetect = true, isServicePort1AutoDetect = true, isServicePort2AutoDetect = true, isReportsPathAutoDetect = true;
    controlPanel.config.readCfgFile(function(cfg, err) {
        if (!err && cfg) {
            if (cfg.controlPanelPort) {
                if (cfg.controlPanelPort !== controlPanel.port) {
                    isControlPanelPortFree = false;
                    isControlPanelPortAutoDetect = true;
                } else isControlPanelPortAutoDetect = false;
            }
            if (cfg.servicePort) {
                if (cfg.servicePort !== controlPanel.config.servicePort) {
                    isServicePort1Free = false;
                    isServicePort1AutoDetect = true;
                } else isServicePort1AutoDetect = false;
            }
            if (cfg.servicePort2) {
                if (cfg.servicePort2 !== controlPanel.config.servicePort2) {
                    isServicePort2Free = false;
                    isServicePort2AutoDetect = true;
                } else isServicePort2AutoDetect = false;
            }
            if (cfg.hostname) isHostnameAutoDetect = false;
            if (cfg.reportsPath) isReportsPathAutoDetect = false;
        }
        controlPanel.config.validateBrowsers(browsers, function(browsers) {
            res.status(200);
            res.render("options", {
                hostname: {
                    value: controlPanel.config.hostname,
                    autoDetect: isHostnameAutoDetect
                },
                controlPanelPort: {
                    value: controlPanel.port,
                    autoDetect: isControlPanelPortAutoDetect,
                    portFree: isControlPanelPortFree
                },
                servicePort1: {
                    value: controlPanel.config.servicePort,
                    autoDetect: isServicePort1AutoDetect,
                    portFree: isServicePort1Free
                },
                servicePort2: {
                    value: controlPanel.config.servicePort2,
                    autoDetect: isServicePort2AutoDetect,
                    portFree: isServicePort2Free
                },
                reportsPath: {
                    value: controlPanel.config.reportsPath,
                    autoDetect: isReportsPathAutoDetect
                },
                browsers: browsers,
                remainingTime: controlPanel.remainingTime,
                homeDir: controlPanel.config.getHomeDir()
            });
        });
    });
};

Server.prototype._configureBrowsers = function(req, res) {
    var browserName = req.param("browserName"), oldName = req.param("oldName") || "", browserInfo = req.param("browserInfo") || null, config = this.config, errMsgBuilder = this.errMsgBuilder;
    var saveBrowsersAndSendResponse = function() {
        config.updateConfig({
            browsers: config.browsers
        }, function(err) {
            if (!err) {
                res.status(200);
                res.render("partial/browsers", {
                    browsers: config.browsers
                });
            } else {
                res.status(403);
                res.send({
                    saveError: errMsgBuilder.build(err)
                });
            }
        });
    };
    if (browserInfo) {
        var browsers = {};
        browsers[browserName] = browserInfo;
        if (oldName && oldName !== browserName) delete config.browsers[oldName];
        config.validateBrowsers(browsers, function(validatedBrowsers) {
            if (validatedBrowsers[browserName].pathExists) {
                config.browsers[browserName] = browserInfo;
                saveBrowsersAndSendResponse();
            } else {
                res.status(403);
                res.send({
                    pathError: true
                });
            }
        });
    } else {
        delete config.browsers[browserName];
        saveBrowsersAndSendResponse();
    }
};

Server.prototype._configureReports = function(req, res) {
    var reportsPath = req.param("reportsPath"), controlPanel = this, warnings = {
        hasChanged: false
    }, errMsgBuilder = this.errMsgBuilder;
    controlPanel.config.readCfgFile(function(cfg, err) {
        if (!err && cfg && (cfg.reportsPath || reportsPath)) {
            controlPanel.config.setReportsPath(reportsPath, function(err) {
                if (err) {
                    res.status(403);
                    res.send(errMsgBuilder.build(err));
                } else controlPanel.config.updateConfig({
                    reportsPath: reportsPath
                }, function(err) {
                    controlPanel.testRunner.reporter.setReportsPath(reportsPath);
                    if (!err) {
                        warnings.hasChanged = true;
                        res.status(200);
                        res.send(warnings);
                    } else {
                        res.status(403);
                        res.send(errMsgBuilder.build(err));
                    }
                });
            });
        } else {
            res.status(200);
            res.send(warnings);
        }
    });
};

Server.prototype._configureNetwork = function(req, res) {
    var controlPanel = this, options = req.param("options"), servicePort1 = options.service_port1, servicePort2 = options.service_port2, controlPanelPort = options.control_panel_port, hostname = options.hostname, changingOptions = {}, warnings = {}, cfgFile = {}, errMsgBuilder = this.errMsgBuilder;
    async.series({
        "Read config file": function(done) {
            controlPanel.config.readCfgFile(function(cfg, err) {
                if (!err && cfg) cfgFile = cfg;
                done();
            });
        },
        "Change service port 1": function(done) {
            if (servicePort1 === undefined) done(); else if (servicePort1 !== "") {
                var parsedPort = parseInt(servicePort1);
                if (parsedPort !== parseInt(cfgFile.servicePort)) {
                    changingOptions.servicePort = parsedPort;
                    controlPanel.config.isPortFree(servicePort1, function(isFree) {
                        if (!isFree) warnings.servicePort1 = true;
                        warnings.hasChanged = true;
                        done();
                    });
                } else done();
            } else {
                changingOptions.servicePort = servicePort1;
                if (cfgFile.servicePort) warnings.hasChanged = true;
                done();
            }
        },
        "Change service port 2": function(done) {
            if (servicePort2 === undefined) done(); else if (servicePort2 !== "") {
                var parsedPort = parseInt(servicePort2);
                if (parsedPort !== parseInt(cfgFile.servicePort2)) {
                    changingOptions.servicePort2 = parsedPort;
                    controlPanel.config.isPortFree(servicePort2, function(isFree) {
                        if (!isFree) warnings.servicePort2 = true;
                        warnings.hasChanged = true;
                        done();
                    });
                } else done();
            } else {
                changingOptions.servicePort2 = servicePort2;
                if (cfgFile.servicePort2) warnings.hasChanged = true;
                done();
            }
        },
        "Change control panel port": function(done) {
            if (controlPanelPort === undefined) done(); else if (controlPanelPort !== "") {
                var parsedPort = parseInt(controlPanelPort);
                if (parsedPort !== parseInt(cfgFile.controlPanelPort)) {
                    changingOptions.controlPanelPort = parsedPort;
                    controlPanel.config.isPortFree(controlPanelPort, function(isFree) {
                        if (!isFree) warnings.controlPanelPort = true;
                        warnings.hasChanged = true;
                        done();
                    });
                } else done();
            } else {
                changingOptions.controlPanelPort = controlPanelPort;
                if (cfgFile.controlPanelPort) warnings.hasChanged = true;
                done();
            }
        },
        "Change hostname": function(done) {
            if ((cfgFile.hostname || hostname) && cfgFile.hostname !== hostname) {
                changingOptions.hostname = hostname;
                warnings.hasChanged = true;
            }
            done();
        }
    }, function() {
        controlPanel.config.updateConfig(changingOptions, function(err) {
            if (!err) {
                res.status(200);
                res.send(warnings);
            } else {
                res.status(403);
                res.send(errMsgBuilder.build(err));
            }
        });
    });
};

Server.prototype._checkUpdates = function(req, res) {
    res.status(200);
    res.send(this.version);
};

Server.prototype._detectBrowsers = function(req, res) {
    var controlPanel = this;
    controlPanel.config.addInstalledBrowsers(function(browsers) {
        res.status(200);
        if (browsers && Object.keys(browsers).length) res.render("partial/browsers", {
            browsers: controlPanel.config.browsers
        }); else res.end();
    });
};

Server.prototype._getFixtureCode = function(req, res) {
    var controlPanel = this, fixtureFile = req.param("fixtureFile"), urlPath = req.param("curPath"), vfsPath = urlPath ? decodeURI(urlPath) : "", fixturePath = path.join(vfsPath, fixtureFile);
    this.vfs.getFixtureCode(fixturePath, function(err, code) {
        if (err) {
            res.status(403);
            res.send(controlPanel.errMsgBuilder.build(err));
        } else {
            res.writeHead(200, {
                "Content-Type": "text/plain"
            });
            res.end(code);
        }
    });
};

Server.prototype._saveFixtureCode = function(req, res) {
    var filename = req.param("filename"), urlPath = req.param("curPath"), code = req.param("code"), vfsPath = urlPath ? decodeURI(urlPath) : "", fixturePath = path.join(vfsPath, filename), errMsgBuilder = this.errMsgBuilder;
    this.vfs.saveFixtureCode(fixturePath, code, function(err) {
        if (err) {
            res.status(403);
            res.send(errMsgBuilder.build(err));
        } else {
            res.writeHead(200, {
                "Content-Type": "text/plain"
            });
            res.end();
        }
    });
};

Server.prototype._clearTaskResults = function(req, res) {
    var removedReportUids = this.testRunner.reporter.removeAllCompletedTaskReports();
    this.testRunner.reporter.removeReportFilesByUids(removedReportUids, function() {
        res.writeHead(200, {
            "Content-Type": "text/plain"
        });
        res.end();
    });
};

Server.prototype._removeTaskReport = function(req, res) {
    var uid = req.param("uid"), reporter = this.testRunner.reporter, report = reporter.getTaskReportByUid(uid);
    if (reporter.isCompletedReport(report)) {
        reporter.removeCompletedTaskReport(uid);
        reporter.removeReportFilesByUids([ uid ], function() {
            res.writeHead(200, {
                "Content-Type": "text/plain"
            });
            res.end();
        });
    } else {
        res.writeHead(200, {
            "Content-Type": "text/plain"
        });
        res.end();
    }
};

Server.prototype._uxlog = function(req, res) {
    this.uxlog.addEntry(this.uxlog.CONTROL_PANEL_ACTION_KIND, req.param("msg"));
    res.status(200);
    res.send("");
};

Server.prototype._toScreen = function(req, res) {
    var imagePath = decodeURIComponent(req.param("path")) || "", title = decodeURIComponent(req.param("title")) || "";
    res.status(200);
    res.render("screenshot", {
        path: imagePath,
        title: title
    });
};

Server.prototype._getScreenshot = function(req, res) {
    var imagePath = decodeURIComponent(req.param("path")) || "", isThumbnail = req.param("thumbnail");
    if (isThumbnail) {
        var filePathArr = imagePath.split(path.sep);
        filePathArr.splice(filePathArr.length - 1, 0, "thumbnails");
        imagePath = filePathArr.join(path.sep);
    }
    if (imagePath && /\.png$/.test(imagePath)) {
        fs.readFile(imagePath, function(err, img) {
            if (!err) {
                res.writeHead(200, {
                    "Content-Type": "image/png"
                });
                res.end(img);
            } else {
                res.status(404);
                res.render("404");
            }
        });
    } else {
        res.status(404);
        res.render("404");
    }
};

Server.prototype._exportReports = function(req, res) {
    var reporter = this.testRunner.reporter, format = req.param("format"), uid = req.param("taskID");
    reporter.zipReport(uid, format, function(err, data) {
        if (err) {
            res.status(404);
            res.render("404");
        } else {
            res.status(200);
            res.set({
                "Content-Disposition": "attachment; filename=" + "report.zip",
                "Content-Type": "application/octet-stream",
                "Content-Length": data.length
            });
            res.send(data);
        }
    });
};

Server.prototype._page404Handler = function(req, res) {
    res.status(404);
    res.render("404");
};

Server.prototype._setupSockets = function() {
    var controlPanel = this, socketIO = this.socketIO, reporter = this.testRunner.reporter, workerPool = this.testRunner.workerPool;
    this.testRunner.on("taskAdded", function(workerNames) {
        workerNames.forEach(function(workerName) {
            socketIO.sockets.in(workerName).emit("taskAdded");
        });
        socketIO.sockets.in("registerSeveralWorkers").emit("taskAdded");
    });
    this.api.on("taskUpdated", function(data) {
        if (typeof data === "object") {
            var taskReport = reporter.getTaskReportByUid(data.uid);
            socketIO.sockets.emit("taskUpdated", {
                taskUid: data.uid,
                runOptions: taskReport._runOptions,
                status: data.status
            });
        }
    });
    reporter.on("taskDetailErrUpdated", function(data) {
        socketIO.sockets.emit("taskDetailErrUpdated", {
            id: data.id
        });
    });
    this.api.on("taskComplete", function(data) {
        if (typeof data === "object" && data.status === "succeeded" || data.status === "failed") {
            var taskReport = reporter.getTaskReportByUid(data.uid);
            socketIO.sockets.emit("taskComplete", {
                taskUid: data.uid,
                taskName: data.name,
                status: data.status,
                passed: data.passed,
                failed: data.failed,
                total: data.testCount,
                runOptions: taskReport._runOptions
            });
        }
    });
    this.vfs.on("suiteChanged", function() {
        socketIO.sockets.emit("vfsRevisionChanged");
    });
    this.vfs.on("suiteStartBuild", function() {
        socketIO.sockets.emit("vfsRevisionStartUpdate");
    });
    this.vfs.on("projectRemoved", function() {
        controlPanel._closeProject(function() {
            controlPanel.needOpenProject = true;
            socketIO.sockets.emit("vfsProjectRemoved");
        });
    });
    workerPool.on("workerAdded", function() {
        socketIO.sockets.emit("workerAdded");
    });
    workerPool.on("workerDisconnected", function() {
        socketIO.sockets.emit("workerDisconnected");
    });
    socketIO.sockets.on("connection", function(socket) {
        socket.on("registerWorker", function(workerName) {
            if (workerName && !socket.disconnected) socket.join(workerName);
        });
        socket.on("registerSeveralWorkers", function() {
            if (!socket.disconnected) socket.join("workerList");
        });
    });
};