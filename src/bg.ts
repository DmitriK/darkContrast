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

interface OptsCache {
  ovrList: string[];
  stdList: string[];
  wMode: boolean;
  delay: number;
};

const {browserAction, runtime, storage, tabs, webNavigation} = browser;

let optCache: OptsCache = {
  ovrList: [],
  stdList: [],
  wMode: false,
  delay: 0,
};
refreshCache();

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
    if (frameId === undefined || frameId === 0) {
      browserAction.setBadgeText({text: 'off', tabId});
    }
  } else if (request === 'std') {
    clearAny(tabId, frameId);

    if (frameId === undefined || frameId === 0) {
      // Applying to all frames
      tabs.insertCSS(tabId, {
        cssOrigin: 'author',
        file:      '/stdAll.css',
        runAt:     'document_start',
      });

      webNavigation.getAllFrames({tabId}).then((frames) => {
        for (let frame of frames) {
          tabs.insertCSS(tabId, {
            cssOrigin: 'author',
            file:      '/stdFgOnly.css',
            runAt:     'document_start',
            frameId:   frame.frameId,
          });
        }
      });
    } else {
      tabs.insertCSS(tabId, {
        cssOrigin: 'author',
        file:      '/stdFgOnly.css',
        runAt:     'document_start',
        frameId
      });
    }
    if (frameId === undefined || frameId === 0) {
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
  if (details.frameId === 0) {
    browserAction.setBadgeText({
        text: '',
        tabId: details.tabId,
      });
  }
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
  if (details.frameId === 0) {
    browserAction.setBadgeText({
            text: 'std',
            tabId: details.tabId,
          });
  }
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
  if (details.frameId === 0) {
    browserAction.setBadgeText({
        text: '',
        tabId: details.tabId,
      });
  }
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
  if (details.frameId === 0) {
    browserAction.setBadgeText({
            text: 'std',
            tabId: details.tabId,
          });
  }
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
    if (details.frameId === 0) {
      browserAction.setBadgeText({
        text: 'off',
        tabId: details.tabId,
      });
    }

    return;
  }

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

function refreshCache() {
  storage.local.get({
    'tcfdt-cr':            4.5,
    'tcfdt-list-disabled': [],
    'tcfdt-list-standard': [],
    'tcfdt-wlist'        : false,
    'tcfdt-dl'           : 0
  }).then((items) => {
    optCache = {
      ovrList: items['tcfdt-list-disabled'],
      stdList: items['tcfdt-list-standard'],
      wMode: items['tcfdt-wlist'],
      delay: items['tcfdt-dl'],
    };
    setContrastRatio(items['tcfdt-cr']);
  });
}

storage.onChanged.addListener((changes) => {
  for (let key of Object.keys(changes)) {
    let val = changes[key].newValue;
    if (key === 'tcfdt-cr') {
      setContrastRatio(val);
    } else if (key === 'tcfdt-list-disabled') {
      optCache.ovrList = val;
    } else if (key === 'tcfdt-list-standard') {
      optCache.stdList = val;
    } else if (key === 'tcfdt-wlist') {
      optCache.wMode = val;
    } else if (key === 'tcfdt-dl') {
      optCache.delay = val;
    }
  }
})

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
  if (optCache.delay === 0) {
    dispatchFixes(details,
                  {
                    off: optCache.ovrList,
                    std: optCache.stdList,
                    wMode: optCache.wMode,
                  });
  } else {
    setTimeout(() => {
        dispatchFixes(details,
                      {
                        off: optCache.ovrList,
                        std: optCache.stdList,
                        wMode: optCache.wMode,
                      });
      }, optCache.delay);
  }
});
