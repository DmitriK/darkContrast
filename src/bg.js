"use strict";

function sendToggle(tabs) {
  let id = tabs[0].id;
  console.log(id);
  browser.tabs.sendMessage(id, {request: 'toggle'}).then(m => {
    console.log("got response?", m, id);
    if (m.toggle) {
      browser.browserAction.setBadgeText({text: "", tabId: id});
    } else {
      browser.browserAction.setBadgeText({text: "🞬", tabId: id});
    }
  });
}

browser.browserAction.onClicked.addListener(() => {
  browser.tabs.query({currentWindow: true, active: true}).then(sendToggle);
});
