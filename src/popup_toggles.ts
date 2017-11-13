/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

import { checkUserInverted } from './lib/checks';

const { runtime } = browser;

function sendToggle(tabs: browser.tabs.Tab[]) {
  const [{id}] = tabs;

  runtime.sendMessage('', {request: 'toggle', tabId: id});
}

// function togg_std(tabs) {
//   const [{id}] = tabs;

//   browser.tabs.sendMessage(id, {request: 'std'});
// }

window.addEventListener('load', () => {
  if (checkUserInverted) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    (document.getElementById('tog_std') as HTMLButtonElement).style.display = 'block';
  }

  (document.getElementById('tog_main') as HTMLButtonElement).addEventListener('click', () => {
    browser.tabs.query({currentWindow: true, active: true}).then(sendToggle);
  });

  (document.getElementById('tog_std') as HTMLButtonElement).addEventListener('click', () => {
    // browser.tabs.query({currentWindow: true, active: true}).then(togg_std);

    // browser.runtime.sendMessage(undefined, {request: 'std'});
  });

  (document.getElementById('open_opts') as HTMLButtonElement).addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
});
