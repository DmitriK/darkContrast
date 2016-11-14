var csPort;

function connected(p) {
  console.log("Content script connected");
  csPort = p;
}

browser.runtime.onConnect.addListener(connected);

browser.browserAction.onClicked.addListener(function() {
  var result = csPort.postMessage({request: 'toggle'});
});
