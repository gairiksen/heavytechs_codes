var fs = require("fs"), util = require("util"), EventEmitter = require("events").EventEmitter;

var DIRECTORY_KEY_PREFIX = "$DIR$", FIXTURE_KEY_PREFIX = "$FIXTURE$", TEST_KEY_PREFIX = "$TEST$";

var RECORD_TYPES = {
    DIR: "dir",
    FIXTURE: "fixture",
    TEST: "test"
};

function createStatusRecord(type, name, parent) {
    if (type === RECORD_TYPES.TEST) {
        return {
            name: name,
            parent: parent,
            failed: void 0,
            lastTaskUid: null,
            type: type
        };
    }
    return {
        name: name,
        parent: parent,
        children: {},
        passed: 0,
        failed: 0,
        lastTaskUid: null,
        type: type
    };
}

function getAncestorCounterIncrements(failedStatus, prevFailedStatus) {
    if (prevFailedStatus === void 0) {
        return {
            failed: failedStatus ? 1 : 0,
            passed: failedStatus ? 0 : 1
        };
    }
    return {
        failed: failedStatus ? 1 : -1,
        passed: failedStatus ? -1 : 1
    };
}

function getNodeStatus(node) {
    if (node.type !== RECORD_TYPES.TEST && node.passed === 0 && node.failed === 0 || node.failed === void 0) return "unknown";
    return node.failed ? "failed" : "passed";
}

function getNodeStatusContribution(node) {
    if (node.type !== RECORD_TYPES.TEST) {
        return {
            passed: node.passed,
            failed: node.failed
        };
    }
    return {
        passed: node.failed ? 0 : 1,
        failed: node.failed ? 1 : 0
    };
}

function buildVfsTrie(suite) {
    var trie = {
        children: {}
    };
    suite.fixtures.forEach(function(fixture) {
        var fixturePath = fixture.path.map(function(dirName) {
            return DIRECTORY_KEY_PREFIX + dirName;
        });
        fixturePath.push(FIXTURE_KEY_PREFIX + fixture.name);
        var fixtureNode = trie;
        for (var i = 0; i < fixturePath.length; i++) {
            var pathChunk = fixturePath[i];
            if (!fixtureNode.children[pathChunk]) {
                fixtureNode.children[pathChunk] = {
                    children: {}
                };
            }
            fixtureNode = fixtureNode.children[pathChunk];
        }
        fixture.tests.forEach(function(test) {
            fixtureNode.children[TEST_KEY_PREFIX + test.name] = true;
        });
    });
    return trie;
}

var StatusIndication = module.exports = function() {
    EventEmitter.call(this);
    this.root = {
        children: {}
    };
    this.updates = [];
};

util.inherits(StatusIndication, EventEmitter);

StatusIndication.prototype._gatherTestNode = function(treePath) {
    var parent = this.root, node = null;
    treePath.forEach(function(pathPart) {
        node = parent.children[pathPart.treeKey];
        if (!node) parent.children[pathPart.treeKey] = node = createStatusRecord(pathPart.type, pathPart.name, parent);
        parent = node;
    });
    return node;
};

StatusIndication.prototype._registerUpdate = function(status, treePath, lastTaskUid) {
    this.updates.push({
        path: treePath.map(function(pathChunk) {
            return pathChunk.name;
        }).join("/"),
        type: treePath[treePath.length - 1].type,
        status: status,
        lastTaskUid: lastTaskUid
    });
};

StatusIndication.prototype._updateTestAncestors = function(testNode, ancestorCounterInc, treePath) {
    var ancestor = testNode.parent;
    while (ancestor !== this.root) {
        var prevStatus = getNodeStatus(ancestor), prevLastTaskUid = ancestor.lastTaskUid;
        ancestor.failed += ancestorCounterInc.failed;
        ancestor.passed += ancestorCounterInc.passed;
        ancestor.lastTaskUid = testNode.lastTaskUid;
        var newStatus = getNodeStatus(ancestor);
        treePath.pop();
        if (prevStatus !== newStatus || prevLastTaskUid !== ancestor.lastTaskUid) this._registerUpdate(newStatus, treePath, testNode.lastTaskUid);
        ancestor = ancestor.parent;
    }
};

StatusIndication.prototype._updateTestNode = function(testRun, treePath, testNode) {
    var failed = !!testRun.errs.length, taskChanged = testNode.lastTaskUid !== testRun.taskUid, statusChanged = taskChanged && testNode.failed !== failed || !testNode.failed && failed;
    if (taskChanged || statusChanged) {
        var ancestorCounterInc = null;
        if (statusChanged) ancestorCounterInc = getAncestorCounterIncrements(failed, testNode.failed); else {
            ancestorCounterInc = {
                failed: 0,
                passed: 0
            };
        }
        testNode.failed = failed;
        testNode.lastTaskUid = testRun.taskUid;
        this._registerUpdate(getNodeStatus(testNode), treePath, testNode.lastTaskUid);
        this._updateTestAncestors(testNode, ancestorCounterInc, treePath);
        if (this.updates.length) {
            this.emit("update", this.updates);
            this.updates = [];
        }
    }
};

StatusIndication.prototype._syncWithVfsRecursive = function(node, vfsNode) {
    var indication = this;
    Object.keys(node.children).forEach(function(childKey) {
        var child = node.children[childKey], vfsChild = vfsNode.children[childKey];
        if (!vfsChild) indication._removeNodeChild(node, childKey, child); else {
            if (child.type !== RECORD_TYPES.TEST) {
                indication._syncWithVfsRecursive(child, vfsChild);
                if (!Object.keys(child.children).length) indication._removeNodeChild(node, childKey, child);
            }
        }
    });
};

StatusIndication.prototype._removeNodeChild = function removeNodeChild(node, childKey, child) {
    var childStatusContribution = getNodeStatusContribution(child), ancestor = node;
    while (ancestor !== this.root) {
        ancestor.passed -= childStatusContribution.passed;
        ancestor.failed -= childStatusContribution.failed;
        ancestor = ancestor.parent;
    }
    delete node.children[childKey];
};

StatusIndication.prototype.update = function(testRun) {
    var treePath = testRun.fixture.path.map(function(dirName) {
        return {
            treeKey: DIRECTORY_KEY_PREFIX + dirName,
            name: dirName,
            type: RECORD_TYPES.DIR
        };
    });
    treePath.push({
        treeKey: FIXTURE_KEY_PREFIX + testRun.fixture.name,
        name: testRun.fixture.name,
        type: RECORD_TYPES.FIXTURE
    });
    treePath.push({
        treeKey: TEST_KEY_PREFIX + testRun.test.name,
        name: testRun.test.name,
        type: RECORD_TYPES.TEST
    });
    var testNode = this._gatherTestNode(treePath);
    this._updateTestNode(testRun, treePath, testNode);
};

StatusIndication.prototype.syncWithVfs = function(suite) {
    var trie = buildVfsTrie(suite);
    this._syncWithVfsRecursive(this.root, trie);
};

StatusIndication.prototype.getDirStatusInfo = function(dirPath) {
    var pathChunks = dirPath.split("/").filter(function(chunk) {
        return chunk.trim().length;
    }), dirNode = this.root;
    for (var i = 0; i < pathChunks.length; i++) {
        dirNode = dirNode.children[DIRECTORY_KEY_PREFIX + pathChunks[i]];
        if (!dirNode) return null;
    }
    return Object.keys(dirNode.children).reduce(function(records, childKey) {
        var child = dirNode.children[childKey];
        records.push(child);
        if (child.type === RECORD_TYPES.FIXTURE) {
            records = Object.keys(child.children).map(function(testKey) {
                return child.children[testKey];
            }).concat(records);
        }
        return records;
    }, []).map(function(record) {
        var status = {
            type: record.type,
            name: record.name,
            lastTaskUid: record.lastTaskUid,
            status: getNodeStatus(record)
        };
        if (record.type === RECORD_TYPES.TEST) status.fixtureName = record.parent.name;
        return status;
    });
};

StatusIndication.prototype.dumpToFile = function(filePath) {
    var toJSON = function() {
        var record = this;
        return Object.keys(record).reduce(function(sanitizedRecord, key) {
            if (key !== "parent") sanitizedRecord[key] = record[key];
            return sanitizedRecord;
        }, {});
    }, attachToJSONRecursive = function(node) {
        node.toJSON = toJSON.bind(node);
        if (node.children) {
            Object.keys(node.children).forEach(function(childKey) {
                attachToJSONRecursive(node.children[childKey]);
            });
        }
    };
    attachToJSONRecursive(this.root);
    fs.writeFileSync(filePath, JSON.stringify(this.root));
};

StatusIndication.prototype.loadFromFile = function(filePath) {
    var attachParentRecursive = function(node) {
        if (node.children) {
            Object.keys(node.children).forEach(function(childKey) {
                var child = node.children[childKey];
                child.parent = node;
                attachParentRecursive(child);
            });
        }
    };
    this.root = JSON.parse(fs.readFileSync(filePath).toString());
    attachParentRecursive(this.root);
};