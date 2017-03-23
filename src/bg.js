'use strict';

browser.runtime.onConnect.addListener((port) => {

  port.onMessage.addListener((m, port) => {
    const {id} = port.sender.tab;

    if (m.badge != null) {
      browser.browserAction.setBadgeText({text: m.badge, tabId: id});
    }
  });
});
