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
  request?: 'off' | 'std';
  allFrames?: boolean;
}

const {browserAction, runtime, tabs, webNavigation} = browser;

runtime.onMessage.addListener((msg: PopupMessage, sender: browser.runtime.MessageSender) => {
  const request = msg.request;
  if (!sender.tab || !sender.tab.id) {
    return;
  }

  const tabId = sender.tab.id;
  const frameId = msg.allFrames ? undefined : sender.frameId;

  if (request === 'off') {
    clearAny(tabId, frameId);
    browserAction.setBadgeText({text: 'off', tabId});
  } else if (request === 'std') {
    clearAny(tabId, frameId);
    // Insert std css into all frames of tab
    tabs.insertCSS(tabId,
                   {
                     cssOrigin: 'author',
                     file:      '/stdAll.css',
                     runAt:     'document_start',
                     allFrames: frameId === undefined,
                     frameId: frameId || 0,
                   },
    );
    if (frameId === undefined) {
      browserAction.setBadgeText({text: 'std', tabId});
    }
  }
});

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
      cssOrigin: 'author',
      file:      '/stdAll.css',
      runAt:     'document_start',
    }
  );
};

const clearAny = (tabId: number, frameId?: number | undefined) => {
  tabs.removeCSS(tabId, {
    allFrames: frameId === undefined,
    file: '/stdInputs.css',
    frameId: frameId || 0,
  });
  tabs.removeCSS(tabId, {
    allFrames: frameId === undefined,
    file: 'stdAll.css',
    frameId: frameId || 0,
  });

  tabs.sendMessage(tabId, {request: 'off'}, frameId ? {frameId} : {});
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
