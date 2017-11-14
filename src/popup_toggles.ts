/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

const { runtime } = browser;

const sendOff = (tabs: browser.tabs.Tab[]): void => {
  const [{id}] = tabs;

  runtime.sendMessage('', {request: 'off', tabId: id});
};

const sendStd = (tabs: browser.tabs.Tab[]): void => {
  const [{id}] = tabs;

  runtime.sendMessage('', {request: 'std', tabId: id});
};

window.addEventListener('load', () => {
  (document.getElementById('tog_main') as HTMLButtonElement).addEventListener('click', () => {
    browser.tabs.query({currentWindow: true, active: true}).then(sendOff);
  });

  (document.getElementById('tog_std') as HTMLButtonElement).addEventListener('click', () => {
     browser.tabs.query({currentWindow: true, active: true}).then(sendStd);
  });

  (document.getElementById('open_opts') as HTMLButtonElement).addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
});
