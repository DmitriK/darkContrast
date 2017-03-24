/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals contrast:false */
'use strict';

function sendToggle(tabs) {
  const [{id}] = tabs;

  browser.tabs.sendMessage(id, {request: 'toggle'});
}

function togg_std(tabs) {
  const [{id}] = tabs;

  browser.tabs.sendMessage(id, {request: 'std'});
}

window.addEventListener('load', () => {
  contrast.updateUserInverted();


  if (contrast.userInverted) {
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

  document.getElementById('open_opts').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
});
