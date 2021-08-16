var fs = require("fs"), util = require("util"), javascriptParser = require("uglify-js").parser, astProcessor = require("uglify-js").uglify, Common = require("./common"), Ast = require("./ast"), ErrCodes = require("./err_codes");

var ELEMENT_SELECTOR_VARIABLE_NAME = "actionTarget", SUPPORTED_NATIVE_DIALOG_TYPES_COUNT = 4;

function getPageDirectiveValue(pageUrl) {
    pageUrl = encodeQuotes(pageUrl);
    if (!Common.SUPPORTED_PROTOCOL_PATTERN.test(pageUrl) && !Common.RELATIVE_URL_PATTERN.test(pageUrl)) return "http://" + pageUrl;
    return pageUrl;
}

function isNewLine(ch) {
    return ch === "\n" || ch === "\r";
}

function encodeQuotes(code) {
    return code.replace(/"/g, '\\"');
}

function replaceCode(srcCode, pos, newCode) {
    if (newCode === "" && srcCode[pos.end] === ";") pos.end++;
    var instantLength = srcCode.length, startLegacy = srcCode.substring(0, pos.start), endLegacy = srcCode.substring(pos.end), code = startLegacy + newCode + endLegacy;
    return {
        code: code,
        shift: code.length - instantLength
    };
}

function insertCode(srcCode, insertionIdx, newCode) {
    if (srcCode[insertionIdx] === ";") insertionIdx++;
    var hasPrependingNewLine = isNewLine(srcCode[insertionIdx]), hasTrailingNewLine = isNewLine(srcCode[insertionIdx + 1]);
    if (hasPrependingNewLine) insertionIdx++; else newCode = "\n" + newCode;
    if (!hasTrailingNewLine) newCode += "\n";
    return srcCode.substr(0, insertionIdx) + newCode + srcCode.substr(insertionIdx);
}

function separateAssertionInfoToBlocks(info) {
    var res = [];
    if (info.blocks && info.blocks.length) {
        info.blocks.forEach(function(block) {
            block.isAssertion = true;
            res.push(block);
        });
    } else res.push(info);
    return res;
}

function getActionArgAst(arg) {
    if (arg instanceof Array) {
        return [ "array", arg.map(function(obj) {
            return getActionArgAst(obj);
        }) ];
    }
    switch (typeof arg) {
      case "number":
        return [ "num", arg ];

      case "string":
        return [ "string", arg ];

      case "object":
        var propAsts = [];
        Object.keys(arg).forEach(function(key) {
            propAsts.push([ key, getActionArgAst(arg[key]) ]);
        });
        return [ "object", propAsts ];

      default:
        return [ "name", "" + arg ];
    }
}

function getStepBodyAst(info, wrapInIFrameArgument) {
    var stepAst = [ "function", null, [], getStepFuncBodyAst(info) ];
    if (info.iFrameSelectors && info.iFrameSelectors.length || info.iFrameSelector) {
        var selector = info.iFrameSelectors ? info.iFrameSelectors[info.currentIFrameSelectorIndex].selector : info.iFrameSelector, selectorAst = null, selectorStatement = null;
        try {
            selectorAst = javascriptParser.parse(selector);
            selectorStatement = selectorAst[1] && selectorAst[1][0] && selectorAst[1][0][1] || [ "string", "" ];
            if (wrapInIFrameArgument) {
                selectorStatement = [ "function", null, [], [ [ "return", selectorStatement ] ] ];
            }
        } catch (parserErr) {
            throw {
                code: ErrCodes.ELEMENT_SELECTOR_PARSING_FAILED,
                parserErr: parserErr
            };
        }
        return [ "call", [ "name", "inIFrame" ], [ selectorStatement, stepAst ] ];
    }
    return [ "function", null, [], getStepFuncBodyAst(info) ];
}

function getStepFuncBodyAst(info) {
    if (info.isAssertion) return getAssertionsStepFuncBodyAst(info); else return getActionStepFuncBodyAst(info);
}

function browserHandlerFuncBodyAst(stepFuncBodyAst, handlers) {
    handlers.forEach(function(handler) {
        if (handler) {
            var retValue = handler.retValue, handleFunctionName = Common.NATIVE_DIALOG_HANDLE_IDENTIFIER_PREFIX + handler.dialog[0].toUpperCase() + handler.dialog.substring(1), argumentAst = null;
            if (typeof retValue === "string") argumentAst = [ [ "string", retValue ] ]; else if (retValue === true || retValue === false || retValue === null) argumentAst = [ [ "name", retValue + "" ] ]; else argumentAst = [];
            stepFuncBodyAst.push([ "stat", [ "call", [ "name", handleFunctionName ], argumentAst ] ]);
        }
    });
}

function getActionStepFuncBodyAst(info) {
    var stepFuncBodyAst = [], actionArgsAst = [], selector = info.selectors && info.selectors[info.currentSelectorIndex] && info.selectors[info.currentSelectorIndex].selector;
    if (selector) {
        var selectorAst = null;
        try {
            selectorAst = javascriptParser.parse(selector);
        } catch (parserErr) {
            throw {
                code: ErrCodes.ELEMENT_SELECTOR_PARSING_FAILED,
                parserErr: parserErr
            };
        }
        var selectorStatement = selectorAst[1] && selectorAst[1][0] && selectorAst[1][0][1] || [ "string", "" ];
        if (selectorStatement[0] === "call" && selectorStatement[1][0] === "name" && (selectorStatement[1][1] === "$" || selectorStatement[1][1] === "jQuery") && selectorStatement[2].length === 1 && selectorStatement[2][0][0] === "string") selectorStatement = selectorStatement[2][0];
        if (selectorStatement[0] !== "string" && selectorStatement[0] !== "function") selectorStatement = [ "function", null, [], [ [ "return", selectorStatement ] ] ];
        if (selectorStatement[0] === "string") {
            actionArgsAst.push(selectorStatement);
        } else {
            stepFuncBodyAst.push([ "var", [ [ ELEMENT_SELECTOR_VARIABLE_NAME, selectorStatement ] ] ]);
            actionArgsAst.push([ "name", ELEMENT_SELECTOR_VARIABLE_NAME ]);
        }
    }
    if (info.nativeDialogHandlers) {
        for (var i = 0; i < SUPPORTED_NATIVE_DIALOG_TYPES_COUNT; i++) {
            var handlers = info.nativeDialogHandlers[i];
            if (!handlers || !handlers.length) continue;
            browserHandlerFuncBodyAst(stepFuncBodyAst, handlers);
        }
    }
    if (info.actionArgs) {
        info.actionArgs.forEach(function(argNameValPair) {
            var argName = Object.keys(argNameValPair)[0];
            actionArgsAst.push(getActionArgAst(argNameValPair[argName]));
        });
    }
    stepFuncBodyAst.push([ "stat", [ "call", [ "dot", [ "name", Common.ACTIONS_OWNER_OBJECT_IDENTIFIER ], info.action ], actionArgsAst ] ]);
    return stepFuncBodyAst;
}

function getAssertionsStepFuncBodyAst(info) {
    var stepFuncBodyAst = [];
    for (var i = 0; i < info.assertions.length; i++) {
        var argumentStatements = [];
        for (var j = 0; j < info.assertions[i].arguments.length; j++) {
            try {
                var argumentAst;
                if (!info.assertions[i].arguments[j]) argumentAst = javascriptParser.parse("undefined"); else argumentAst = javascriptParser.parse(info.assertions[i].arguments[j]);
                argumentStatements.push(argumentAst[1] && argumentAst[1][0] && argumentAst[1][0][1] || [ "string", "" ]);
            } catch (parserErr) {
                throw {
                    code: ErrCodes.ASSERTION_ARGUMENT_PARSING_FAILED,
                    parserErr: parserErr
                };
            }
        }
        if (info.assertions[i].message) argumentStatements.push([ "string", info.assertions[i].message ]);
        stepFuncBodyAst.push([ "stat", [ "call", [ "name", info.assertions[i].operator ], argumentStatements ] ]);
    }
    return stepFuncBodyAst;
}

function createTestAst(testName, stepsInfo) {
    var stepsAst = [], stepIndex = 0;
    stepsInfo.forEach(function(info) {
        var blocks = info.isAssertion ? separateAssertionInfoToBlocks(info) : [ info ], stepName = null;
        if (blocks.length > 1) {
            ++stepIndex;
            for (var i = 0; i < blocks.length; i++) {
                stepName = stepIndex + "." + (i + 1) + "." + info.name;
                stepsAst.push([ stepName, getStepBodyAst(blocks[i]) ]);
            }
        } else {
            stepName = ++stepIndex + "." + info.name;
            stepsAst.push([ stepName, getStepBodyAst(blocks[0]) ]);
        }
    });
    return [ "stat", [ "assign", true, [ "sub", [ "string", Common.TEST_DECLARATION_MARKER ], [ "string", testName ] ], [ "object", stepsAst ] ] ];
}

function performActionOnTest(filename, testName, action, callback) {
    Ast.construct(filename, null, function(parseErr, ast, srcCode) {
        if (parseErr) {
            callback(parseErr);
            return;
        }
        var walker = astProcessor.ast_walker(), testStat = null, testNameObj = null, testIsFound = false, testNames = [];
        walker.with_walkers({
            string: function() {
                var astPath = walker.stack(), matchTestName = "";
                if (this[1] === Common.TEST_DECLARATION_MARKER) {
                    matchTestName = Ast.getAncestorByName("sub", astPath)[2];
                    testNames.push(matchTestName[1]);
                    if (matchTestName[1] === testName && Ast.isPathMatch(Common.TEST_AND_MIXIN_DECLARATION_AST_PATH, walker.stack())) {
                        testIsFound = true;
                        testStat = Ast.getAncestorByName("stat", astPath);
                        testNameObj = matchTestName;
                    }
                }
            }
        }, function() {
            walker.walk(ast);
        });
        if (testIsFound) {
            var updatedSrcCode = action(testNameObj, testNames, testStat, srcCode);
            if (updatedSrcCode !== null) {
                fs.writeFile(filename, updatedSrcCode, function(writeErrs) {
                    callback(writeErrs ? {
                        code: ErrCodes.WRITE_FILE_FAILED,
                        filename: filename
                    } : null);
                });
            }
        } else {
            callback({
                code: ErrCodes.TEST_IS_NOT_FOUND,
                testName: testName
            });
        }
    });
}

exports.createFixture = function(fileName, fixtureName, fixturePage, callback) {
    var fixtureCode = util.format(Common.NEW_FIXTURE_CODE_PATTERN, fixtureName, getPageDirectiveValue(fixturePage));
    fs.writeFile(fileName, fixtureCode, function(writeErr) {
        callback(writeErr ? {
            code: ErrCodes.WRITE_FILE_FAILED,
            filename: fileName
        } : null);
    });
};

exports.editDirectives = function(fileName, directives, callback) {
    Ast.construct(fileName, null, function(getAstErr, ast, srcCode) {
        if (getAstErr) {
            callback(getAstErr);
            return;
        }
        var walker = astProcessor.ast_walker(), fixtureDirectivePos = null, authDirectivePos = null, pageDirectivePos = null, lastMandatoryDirectiveEndPos = 0, posShift = 0;
        walker.with_walkers({
            string: function() {
                var match = Common.DIRECTIVE_EXPRESSION_PATTERN.exec(this[1]);
                if (match && Ast.isPathMatch(Common.DIRECTIVE_EXPRESSION_AST_PATH, walker.stack())) {
                    var astPath = walker.stack(), replacePos = null, replacement = null;
                    switch (match[1]) {
                      case Common.AUTH_DIRECTIVE_LVALUE:
                        authDirectivePos = Ast.getSrcCodePosFromPath(astPath);
                        if (directives.auth) {
                            replacePos = authDirectivePos;
                            replacement = util.format(Common.AUTH_DIRECTIVE_PATTERN, directives.auth);
                        } else if (directives.auth === null) {
                            replacePos = authDirectivePos;
                            replacement = "";
                        }
                        break;

                      case Common.FIXTURE_DIRECTIVE_LVALUE:
                        fixtureDirectivePos = Ast.getSrcCodePosFromPath(astPath);
                        lastMandatoryDirectiveEndPos = fixtureDirectivePos.end;
                        if (directives.fixture) {
                            replacePos = fixtureDirectivePos;
                            replacement = util.format(Common.FIXTURE_DIRECTIVE_PATTERN, encodeQuotes(directives.fixture));
                        }
                        break;

                      case Common.PAGE_DIRECTIVE_LVALUE:
                        pageDirectivePos = Ast.getSrcCodePosFromPath(astPath);
                        lastMandatoryDirectiveEndPos = pageDirectivePos.end;
                        if (directives.page) {
                            replacePos = pageDirectivePos;
                            replacement = util.format(Common.PAGE_DIRECTIVE_PATTERN, getPageDirectiveValue(directives.page));
                        }
                        break;

                      default:
                        return;
                    }
                    if (replacePos) {
                        replacePos.start += posShift;
                        replacePos.end += posShift;
                        var replaceResult = replaceCode(srcCode, replacePos, replacement);
                        srcCode = replaceResult.code;
                        posShift += replaceResult.shift;
                    }
                }
            }
        }, function() {
            walker.walk(ast);
        });
        if (fixtureDirectivePos && pageDirectivePos) {
            if (!authDirectivePos && directives.auth) {
                var insertionIdx = lastMandatoryDirectiveEndPos + posShift + 1, directiveCode = util.format(Common.AUTH_DIRECTIVE_PATTERN, encodeQuotes(directives.auth)) + ";";
                srcCode = insertCode(srcCode, insertionIdx, directiveCode);
            }
            fs.writeFile(fileName, srcCode, function(writeErr) {
                callback(writeErr ? {
                    code: ErrCodes.WRITE_FILE_FAILED,
                    filename: fileName
                } : null);
            });
        } else {
            callback({
                code: ErrCodes.INVALID_FILE_FORMAT,
                filename: fileName
            });
        }
    });
};

exports.overwriteTest = function(fileName, testName, stepsInfo, callback) {
    var testAst = null;
    try {
        testAst = createTestAst(testName, stepsInfo);
    } catch (testAstCreationErr) {
        callback(testAstCreationErr);
        return;
    }
    var action = function(testNameAst, testNames, testStat, srcCode) {
        var testPos = Ast.getSrcCodePosFromEntry(testStat), testCode = "\n" + astProcessor.gen_code(testAst, {
            beautify: true
        }) + "\n";
        return replaceCode(srcCode, testPos, testCode).code;
    };
    performActionOnTest(fileName, testName, action, function(err) {
        if (err && err.code === ErrCodes.TEST_IS_NOT_FOUND) {
            exports.addTest(fileName, testName, stepsInfo, callback);
        } else callback(err);
    });
};

exports.addTest = function(fileName, testName, stepsInfo, callback) {
    Ast.construct(fileName, null, function(getAstErr, ast, srcCode) {
        if (getAstErr) {
            callback(getAstErr);
            return;
        }
        var walker = astProcessor.ast_walker(), insertionIdx = -1, fixtureDirectiveFound = false, pageDirectiveFound = false, testNames = [];
        walker.with_walkers({
            string: function() {
                var astPath = walker.stack();
                if (this[1] === Common.TEST_DECLARATION_MARKER && Ast.isPathMatch(Common.TEST_AND_MIXIN_DECLARATION_AST_PATH, astPath)) {
                    var topStat = Ast.getAncestorByName("stat", astPath);
                    insertionIdx = Ast.getSrcCodePosFromEntry(topStat).end;
                    testNames.push(Ast.getAncestorByName("sub", astPath)[2][1]);
                } else {
                    var match = Common.DIRECTIVE_EXPRESSION_PATTERN.exec(this[1]);
                    if (match && Ast.isPathMatch(Common.DIRECTIVE_EXPRESSION_AST_PATH, astPath) && Common.DIRECTIVE_LVALUES.indexOf(match[1]) > -1) {
                        if (match[1] === Common.FIXTURE_DIRECTIVE_LVALUE) fixtureDirectiveFound = true; else if (match[1] === Common.PAGE_DIRECTIVE_LVALUE) pageDirectiveFound = true;
                        insertionIdx = Ast.getSrcCodePosFromPath(astPath).end;
                    }
                }
            }
        }, function() {
            walker.walk(ast);
        });
        if (insertionIdx === -1 || !fixtureDirectiveFound || !pageDirectiveFound) {
            callback({
                code: ErrCodes.INVALID_FILE_FORMAT,
                filename: fileName
            });
            return;
        }
        if (testNames.indexOf(testName) > -1) {
            callback({
                code: ErrCodes.TEST_NAME_CHANGED_TO_ALREADY_USED,
                testName: testName
            });
            return;
        }
        var testAst = null;
        try {
            testAst = createTestAst(testName, stepsInfo);
        } catch (testAstCreationErr) {
            callback(testAstCreationErr);
            return;
        }
        var testCode = "\n" + astProcessor.gen_code(testAst, {
            beautify: true
        }) + "\n";
        srcCode = insertCode(srcCode, insertionIdx, testCode);
        fs.writeFile(fileName, srcCode, function(writeErr) {
            callback(writeErr ? {
                code: ErrCodes.WRITE_FILE_FAILED,
                filename: fileName
            } : null);
        });
    });
};

exports.deleteTest = function(filename, testName, callback) {
    var action = function(testNameAst, testNames, testStat, srcCode) {
        var testPos = Ast.getSrcCodePosFromEntry(testStat);
        return replaceCode(srcCode, testPos, "").code;
    };
    performActionOnTest(filename, testName, action, callback);
};

exports.renameTest = function(filename, oldName, newName, callback) {
    var action = function(testNameAst, testNames, testStat, srcCode) {
        if (testNames.indexOf(newName) === -1) {
            var namePos = Ast.getSrcCodePosFromEntry(testNameAst), replacement = '"' + encodeQuotes(newName) + '"';
            return replaceCode(srcCode, namePos, replacement).code;
        } else {
            callback({
                code: ErrCodes.TEST_NAME_CHANGED_TO_ALREADY_USED,
                line: testNameAst[0].start.line,
                testName: newName
            });
            return null;
        }
    };
    performActionOnTest(filename, oldName, action, callback);
};

exports.getTestStepBodies = function(stepsInfo, wrapInIFrameArgument) {
    var steps = [];
    stepsInfo.forEach(function(info) {
        if (info.isAssertion) {
            var blocks = separateAssertionInfoToBlocks(info);
            blocks.forEach(function(block) {
                steps.push(getStepBodyAst(block, wrapInIFrameArgument));
            });
        } else steps.push(getStepBodyAst(info, wrapInIFrameArgument));
    });
    return astProcessor.gen_code([ "array", steps ]);
};