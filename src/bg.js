/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals getDefaultComputedStyle:false */
'use strict';

const {tabs, webNavigation} = browser;

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

let constrastRatio = 4.5;

const getIntensity = (srgb) => {
  const rgbNormalized = [srgb.r / 255.0, srgb.g / 255.0, srgb.b / 255.0];
  const rgbLin = rgbNormalized.map((v) => {
    if (v <= 0.03928) {
      return v / 12.92;
    }

    return Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rgbLin[0] + 0.7152 * rgbLin[1] + 0.0722 * rgbLin[2];
};

const isContrasty = (fg, bg) => {
  const lumF = getIntensity(fg);
  const lumB = getIntensity(bg);

  const L1 = Math.max(lumF, lumB);
  const L2 = Math.min(lumF, lumB);

  return (L1 + 0.05) / (L2 + 0.05) > constrastRatio;
};

const toRGB = (s) => {
  if (s === 'transparent') {
    return {r: 0, g: 0, b: 0, a: 0};
  }

  const rgb = {};
  const parts = s.split(',', 4);

  rgb.r = parseInt(parts[0].substr(parts[0].indexOf('(', 3) + 1), 10);
  rgb.g = parseInt(parts[1].trim(), 10);
  rgb.b = parseInt(parts[2].trim(), 10);
  if (parts[3] == null) {
    rgb.a = 1;
  } else {
    rgb.a = parseInt(parts[3].trim(), 10);
  }

  return rgb;
};

const checkUserInverted = () => {
  const defaultFg =
    toRGB(getDefaultComputedStyle(document.documentElement).color);

  if (!isContrasty(defaultFg, {r: 255, g: 255, b: 255, a: 1})) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    return true;
  }

  return false;
};


webNavigation.onCompleted.addListener((details) => {
  browser.storage.local.get({'tcfdt-cr': 4.5}).then((items) => {
    constrastRatio = items['tcfdt-cr'];
    if (checkUserInverted()) {
    } else {
      tabs.insertCSS(
        details.tabId,
        {
          allFrames: true,
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
          runAt:     'document_end',
        }
      );
    }
  });
});
