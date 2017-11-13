/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

import { setContrastRatio } from './lib/color';
import { checkUserInverted } from './lib/checks';

interface WebNavDetails {
  tabId: number;
  url: string;
  processId: number;
  frameId: number;
  timeStamp: number;
}

interface PopupMessage {
  request: 'toggle';
  tabId: number;
}

const {browserAction, runtime, tabs, webNavigation} = browser;

runtime.onMessage.addListener((msg: {}) => {
  browserAction.getBadgeText({tabId: (msg as PopupMessage).tabId}).then((value: string) => {
    if (value === '') {
      // Was operational, need to disable
      clearAny((msg as PopupMessage).tabId);
    }
  });
});

// Handler for port connection, used for extension button and badge updates.
/*browser.runtime.onConnect.addListener((port) => {
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
        file:      '/embed.css',
        frameId:   sender.frameId,
        runAt:     'document_idle',
      });
    } else if (m.frame === 'fix') {
      browser.tabs.executeScript(sender.tab.id, {
        file:    '/checkContrast.js',
        frameId: sender.frameId,
        runAt:   'document_idle',
      });
    } else if (m.frame === 'clr') {
      browser.tabs.removeCSS(sender.tab.id, {
        file:    '/embed.css',
        frameId: sender.frameId,
      });
    }
  }
});

// Need to add standard sheet as a user-sheet, which can only be done via
// tabs.insertCSS, so do that here
tabs.onUpdated.addListener((tabId) => {
  browser.tabs.insertCSS(tabId.id, {
    allFrames: true,
    cssOrigin: 'user',
    file:      '/std.css',
    runAt:     'document_end',
  });
});*/

const fixInputs = (details: WebNavDetails) => {
  tabs.insertCSS(
    details.tabId,
    {
      frameId:   details.frameId,
      cssOrigin: 'author',
      file:      '/fixContrast.css',
      runAt:     'document_end',
    }
  );
  tabs.executeScript(
    details.tabId,
    {
      file:    '/fixInputs.js',
      frameId: details.frameId,
      runAt:   'document_end',
    }
  );
};

const stdInputs = (details: WebNavDetails) => {
  tabs.insertCSS(
    details.tabId,
    {
      frameId:   details.frameId,
      cssOrigin: 'user',
      file:      '/stdInputs.css',
      runAt:     'document_end',
    }
  );
};

const fixAll = (details: WebNavDetails) => {
  tabs.insertCSS(
    details.tabId,
    {
      frameId:   details.frameId,
      cssOrigin: 'author',
      file:      '/fixContrast.css',
      runAt:     'document_end',
    }
  );
  tabs.executeScript(
    details.tabId,
    {
      file:    '/fixAll.js',
      frameId: details.frameId,
      runAt:   'document_end',
    }
  );
};

const stdAll = (details: WebNavDetails) => {
  tabs.insertCSS(
    details.tabId,
    {
      frameId:   details.frameId,
      cssOrigin: 'user',
      file:      '/stdAll.css',
      runAt:     'document_end',
    }
  );
};

const clearAny = (tabId: number) => {
  tabs.removeCSS(tabId, {
    file: '/stdInputs.css',
  });
  tabs.removeCSS(tabId, {
    file: 'stdAll.css',
  });

  tabs.sendMessage(tabId, {request: 'off'});

  browserAction.setBadgeText({text: 'off', tabId});
};

const inList = (list: string[]) => {
  for (const entry of list) {
    if (window.location.href.indexOf(entry) !== -1) {
      return true;
    }
  }

  return false;
};


webNavigation.onCompleted.addListener((details: WebNavDetails) => {
  browser.storage.local.get({
    'tcfdt-cr':            4.5,
    'tcfdt-list-disabled': [],
    'tcfdt-list-standard': [],
  }).then((items) => {
    setContrastRatio(items['tcfdt-cr']);
    const offList = items['tcfdt-list-disabled'];
    const stdList = items['tcfdt-list-standard'];

    // Do nothing if extension is disabled for this site
    if (inList(offList)) {
      browserAction.setBadgeText({
        text: 'off',
        tabId: details.tabId,
      });
      return;
    }

    browserAction.setBadgeText({
        text: '',
        tabId: details.tabId,
      });

    if (checkUserInverted()) {
      if (inList(stdList)) {
        stdAll(details);
      } else {
        fixAll(details);
      }
    } else {
      if (inList(stdList)) {
        stdInputs(details);
      } else {
        fixInputs(details);
      }
    }
  });
});
