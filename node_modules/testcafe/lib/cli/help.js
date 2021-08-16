var fs = require("fs"), path = require("path");

var HELP_PATH = path.join(__dirname, "help.json");

var getHelpByOption = function(helpContent, option) {
    var result = "";
    switch (option) {
      case "":
        Object.keys(helpContent).forEach(function(key) {
            result = result ? helpContent[key] : [ result, helpContent[key] ].join("\n");
        });
        break;

      case "/r":
      case "/runTests":
        result = helpContent["runTests"];
        break;

      case "/a":
      case "/browser":
        result = helpContent["browser"];
        break;

      case "/b":
      case "/browsers":
        result = helpContent["browsers"];
        break;

      case "/c":
      case "/config":
        result = helpContent["config"];
        break;

      case "/l":
      case "/log":
        result = helpContent["log"];
        break;

      case "/t":
      case "/timeout":
        result = helpContent["timeout"];
        break;

      case "/h":
      case "/?":
      case "/help":
        result = helpContent["help"];
        break;
    }
    return result;
};

exports.getHelp = function(option, callback) {
    fs.readFile(HELP_PATH, "UTF8", function(err, data) {
        data = JSON.parse(data);
        callback(getHelpByOption(data, option));
    });
};