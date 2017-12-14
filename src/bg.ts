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
  request?: 'off' | 'std' | 'stdFg';
  allFrames?: boolean;
  tabId?: number;
}

const {browserAction, runtime, tabs, webNavigation} = browser;

runtime.onMessage.addListener((msg: PopupMessage, sender: browser.runtime.MessageSender) => {
  const request = msg.request;

  let tabId = 0;

  if (sender.tab && sender.tab.id) {
    tabId = sender.tab.id;
  } else if (msg.tabId) {
    tabId = msg.tabId;
  } else {
    return;
  }

  const frameId = msg.allFrames ? undefined : sender.frameId;

  if (request === 'off') {
    clearAny(tabId, frameId);
    browserAction.setBadgeText({text: 'off', tabId});
  } else if (request === 'std') {
    clearAny(tabId, frameId);
    const details: browser.extensionTypes.InjectDetailsCSS = {
      cssOrigin: 'author',
      file:      '/stdAll.css',
      runAt:     'document_start'
    };

    if (frameId === undefined) {
      details.allFrames = true;
    } else {
      details.frameId = frameId;
    }
    tabs.insertCSS(tabId, details);
    if (frameId === undefined) {
      browserAction.setBadgeText({text: 'std', tabId});
    }
  } else if (request === 'stdFg') {
    clearAny(tabId, frameId);
    // Insert std css into all frames of tab
    tabs.insertCSS(tabId,
                   {
                     cssOrigin: 'author',
                     file:      '/stdFgOnly.css',
                     runAt:     'document_start',
                     frameId: frameId || 0,
                   },
    );
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
  browserAction.setBadgeText({
          text: 'std',
          tabId: details.tabId,
        });
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
  browserAction.setBadgeText({
          text: 'std',
          tabId: details.tabId,
        });
};

const clearAny = (tabId: number, frameId?: number | undefined) => {
  let details: browser.extensionTypes.InjectDetails = {};

  if (frameId === undefined) {
    details.allFrames = true;
  } else {
    details.frameId = frameId;
  }

  tabs.removeCSS(tabId, Object.assign(details, {
    file: '/stdInputs.css',
  }));
  tabs.removeCSS(tabId, Object.assign(details, {
    file: '/stdAll.css',
  }));
  tabs.removeCSS(tabId, Object.assign(details, {
    file: '/stdFgOnly.css',
  }));

  tabs.sendMessage(tabId, {request: 'off'}, frameId ? {frameId} : {});
};

const inList = (url: string, list: string[]) => {
  for (const entry of list) {
    if (url.indexOf(entry) !== -1 && entry !== "") {
      return true;
    }
  }

  return false;
};

const dispatchFixes = (details: WebNavDetails,
                       lists: { off: string[]; std: string[]; wMode: boolean } =
                              { off: [],       std: [],       wMode: false}) => {
  // Do nothing if extension is disabled for this site and in blacklist mode
  if (inList(details.url, lists.off) && !lists.wMode) {
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
    if (inList(details.url, lists.std)) {
      stdAll(details);
    } else {
      if (!inList(details.url, lists.off) && lists.wMode) {
        browserAction.setBadgeText({
          text: 'off',
          tabId: details.tabId,
        });

        return;
      }
      fixAll(details);
    }
  } else {
    if (inList(details.url, lists.std)) {
      stdInputs(details);
    } else {
      if (!inList(details.url, lists.off) && lists.wMode) {
        browserAction.setBadgeText({
          text: 'off',
          tabId: details.tabId,
        });

        return;
      }
      fixInputs(details);
    }
  }
};

// Add listener to frames early to ensure our script has first chance to catch messages
webNavigation.onDOMContentLoaded.addListener((details: WebNavDetails) => {
  if (details.frameId > 0) {
    tabs.executeScript(
      details.tabId,
      {
        file:    '/frameListener.js',
        frameId: details.frameId,
        runAt:   'document_start',
      },
    );
  }
});

webNavigation.onCompleted.addListener((details: WebNavDetails) => {
  browser.storage.local.get({
    'tcfdt-cr':            4.5,
    'tcfdt-list-disabled': [],
    'tcfdt-list-standard': [],
    'tcfdt-wlist'        : false,
    'tcfdt-dl'           : 0
  }).then((items) => {
    setContrastRatio(items['tcfdt-cr']);
    const delay = items['tcfdt-dl'];

    if (delay === 0) {
      dispatchFixes(details,
                    {
                      off: items['tcfdt-list-disabled'],
                      std: items['tcfdt-list-standard'],
                      wMode: items['tcfdt-wlist'],
                    });
    } else {
      setTimeout(() => {
          dispatchFixes(details,
                        {
                          off: items['tcfdt-list-disabled'],
                          std: items['tcfdt-list-standard'],
                          wMode: items['tcfdt-wlist'],
                        });
        }, delay);
    }
  });
});
