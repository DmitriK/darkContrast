/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

const { runtime } = browser;

window.addEventListener('load', () => {
  (document.getElementById('tog_main') as HTMLButtonElement).addEventListener('click', () => {
    browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
      runtime.sendMessage('', {request: 'off', allFrames: true, tabId: tabs[0].id});
    });
  });

  (document.getElementById('tog_std') as HTMLButtonElement).addEventListener('click', () => {
     browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
       runtime.sendMessage('', {request: 'std', allFrames: true, tabId: tabs[0].id});
     });
  });

  (document.getElementById('open_opts') as HTMLButtonElement).addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
});
