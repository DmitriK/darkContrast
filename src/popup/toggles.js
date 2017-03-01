/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* global getDefaultComputedStyle:false, color:false */
'use strict';

function sendToggle(tabs) {
  const [{id}] = tabs;

  browser.tabs.sendMessage(id, {request: 'toggle'}).then((m) => {
    if (m.toggle) {
      browser.browserAction.setBadgeText({text: '', tabId: id});
    } else {
      browser.browserAction.setBadgeText({text: 'off', tabId: id});
    }
  });
}

function togg_std(tabs) {
  const [{id}] = tabs;

  browser.tabs.sendMessage(id, {request: 'std'}).then((m) => {
    if (m.std) {
      browser.browserAction.setBadgeText({text: 'std', tabId: id});
    } else {
      browser.browserAction.setBadgeText({text: '', tabId: id});
    }
  });
}

window.addEventListener('load', () => {
  const defaultFg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).color);
  const defaultBg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).backgroundColor);

  if (!color.is_contrasty(defaultFg, {r: 255, g: 255, b: 255, a: 1}) ||
      !color.is_contrasty({r: 0, g: 0, b: 0, a: 1}, defaultBg)) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    document.getElementById('tog_std').style.display = 'block';
  }

  document.getElementById('tog_main').addEventListener('click', () => {
    browser.tabs.query({currentWindow: true, active: true}).then(sendToggle);
  });

  document.getElementById('tog_std').addEventListener('click', () => {
    browser.tabs.query({currentWindow: true, active: true}).then(togg_std);
  });
});
