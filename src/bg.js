var csPort;

function connected(p) {
  csPort = p;
}

browser.runtime.onConnect.addListener(connected);

browser.browserAction.onClicked.addListener(function() {
  var result = csPort.postMessage({request: 'toggle'});
});
