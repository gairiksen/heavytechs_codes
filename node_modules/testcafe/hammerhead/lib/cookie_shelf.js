var util = require("util"), CookieJar = require("tough-cookie").CookieJar;

function getJarUid(jobInfo) {
    return jobInfo.ownerToken + jobInfo.uid;
}

var CookieShelf = module.exports = function() {
    this.jars = {};
};

CookieShelf.prototype._getJar = function(jobInfo, createIfNotExist) {
    var jarUid = getJarUid(jobInfo), jar = this.jars[jarUid];
    if (!jar && createIfNotExist) jar = this.jars[jarUid] = new CookieJar();
    return jar;
};

CookieShelf.prototype._setCookie = function(jobInfo, resourceUrl, cookie, client) {
    var jar = this._getJar(jobInfo, true);
    cookie = util.isArray(cookie) ? cookie : [ cookie ];
    cookie.forEach(function(cookieEntry) {
        jar.setCookieSync(cookieEntry, resourceUrl, {
            http: !client,
            ignoreError: true
        });
    });
};

CookieShelf.prototype._getCookieString = function(jobInfo, resourceUrl, client) {
    var jar = this._getJar(jobInfo);
    return jar ? jar.getCookieStringSync(resourceUrl, {
        http: !client
    }) : null;
};

CookieShelf.prototype.setCookieByServer = function(jobInfo, resourceUrl, cookie) {
    this._setCookie(jobInfo, resourceUrl, cookie, false);
};

CookieShelf.prototype.setCookieByClient = function(jobInfo, resourceUrl, cookie) {
    this._setCookie(jobInfo, resourceUrl, cookie, true);
};

CookieShelf.prototype.getClientCookieString = function(jobInfo, resourceUrl) {
    return this._getCookieString(jobInfo, resourceUrl, true) || "";
};

CookieShelf.prototype.getCookieHeader = function(jobInfo, resourceUrl) {
    return this._getCookieString(jobInfo, resourceUrl, false) || null;
};

CookieShelf.prototype.removeCookies = function(jobInfo) {
    var jarUid = getJarUid(jobInfo);
    delete this.jars[jarUid];
};