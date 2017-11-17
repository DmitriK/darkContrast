/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

const { runtime } = browser;

window.addEventListener('load', () => {
  (document.getElementById('tog_main') as HTMLButtonElement).addEventListener('click', () => {
    browser.tabs.query({currentWindow: true, active: true}).then(() => {
      runtime.sendMessage('', {request: 'off', allFrames: true});
    });
  });

  (document.getElementById('tog_std') as HTMLButtonElement).addEventListener('click', () => {
     browser.tabs.query({currentWindow: true, active: true}).then(() => {
       runtime.sendMessage('', {request: 'std', allFrames: true});
     });
  });

  (document.getElementById('open_opts') as HTMLButtonElement).addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
});
