var csPort;

function connected(p) {
  csPort = p;

  csPort.onMessage.addListener(function (m, sender) {
    let tab = csPort.sender.tab.id;
    if (m.toggle) {
      browser.browserAction.setBadgeText({text:"", tabId:tab});
    } else {
      browser.browserAction.setBadgeText({text:"🞬", tabId:tab});
    }
  });
}

browser.runtime.onConnect.addListener(connected);

browser.browserAction.onClicked.addListener(function () {
  csPort.postMessage({request: 'toggle'});
});
