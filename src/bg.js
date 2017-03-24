/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
'use strict';

// Handler for port connection, used for extension button and badge updates.
browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((m, rport) => {
    const {id} = rport.sender.tab;

    if (m.badge != null) {
      browser.browserAction.setBadgeText({text: m.badge, tabId: id});
    }
  });
});

// Handler for embedded docs to trigger script insertion.
browser.runtime.onMessage.addListener((m, sender) => {
  if (m.frame != null) {
    if (m.frame === 'std') {
      browser.tabs.insertCSS(sender.tab.id, {
        cssOrigin: 'user',
        file:      'embed.css',
        frameId:   sender.frameId,
        runAt:     'document_idle',
      });
    } else if (m.frame === 'fix') {
      browser.tabs.executeScript(sender.tab.id, {
        file:    'checkContrast.js',
        frameId: sender.frameId,
        runAt:   'document_idle',
      });
    } else if (m.frame === 'clr') {
      browser.tabs.removeCSS(sender.tab.id, {
        file:    'embed.css',
        frameId: sender.frameId,
      });
    }
  }
});
