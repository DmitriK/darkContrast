/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
'use strict';

browser.runtime.onMessage.addListener((m, sender) => {
  if (m.frame != null) {
    if (m.frame === 'std') {
      browser.tabs.insertCSS(sender.tab.tabId, {
        cssOrigin: 'user',
        file:      'embed.css',
        frameId:   sender.frameId,
        runAt:     'document_idle',
      });
    } else if (m.frame === 'fix') {
      browser.tabs.executeScript(sender.tab.tabId, {
        file:    'checkContrast.js',
        frameId: sender.frameId,
        runAt:   'document_idle',
      });
    }
  }
});
