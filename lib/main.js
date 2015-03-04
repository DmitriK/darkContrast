// Import the page-mod API
var pageMod = require("sdk/page-mod");
var prefs = require("sdk/preferences/service");

var darkColor, lightColor;

if (prefs.get("browser.display.use_system_colors")) {
    darkColor = "WindowFrame";
    lightColor = "WindowText";
} else {
    darkColor = prefs.get("browser.display.foreground_color");
    lightColor = prefs.get("browser.display.background_color");
}

// Create a page mod
// It will run a script whenever a ".org" URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
  include: "*",
  contentScriptFile : './checkContrast.js',
  onAttach: function(worker) {
    worker.port.emit("colors", [darkColor, lightColor]);
  }
});
