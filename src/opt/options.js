/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
'use strict';

function populateDisabled() {
  browser.storage.local.get('tcfdt-list-disabled').then((list) => {
    if ({}.hasOwnProperty.call(list, 'tcfdt-list-disabled')) {
      document.getElementById('blacklist').value =
        list['tcfdt-list-disabled'].join('\n');
    }
  });
}

function populateStandard() {
  browser.storage.local.get('tcfdt-list-standard').then((list) => {
    if ({}.hasOwnProperty.call(list, 'tcfdt-list-standard')) {
      document.getElementById('standardlist').value =
        list['tcfdt-list-standard'].join('\n');
    }
  });
}

async function main() {
  populateDisabled();
  populateStandard();

  document.getElementById('save-dis').addEventListener('click', () => {
    const lines =
      document.getElementById('blacklist').value.split('\n').filter(s => s.trim() !== "");

    if (lines.length === 0) {
      browser.storage.local.remove({'tcfdt-list-disabled': lines});
    } else {
      browser.storage.local.set({'tcfdt-list-disabled': lines});
    }
  });

  document.getElementById('save-std').addEventListener('click', () => {
    const lines =
      document.getElementById('standardlist').value.split('\n').filter(s => s.trim() !== "");

    if (lines.length === 0) {
      browser.storage.local.remove({'tcfdt-list-standard': lines});
    } else {
      browser.storage.local.set({'tcfdt-list-standard': lines});
    }
  });

  document.getElementById('revert-dis').addEventListener('click', () => {
    document.getElementById('blacklist').value = '';
    populateDisabled();
  });

  document.getElementById('revert-std').addEventListener('click', () => {
    document.getElementById('standardlist').value = '';
    populateStandard();
  });

  // Handle contrast ratio
  browser.storage.local.get('tcfdt-cr').then((opts) => {
    if ({}.hasOwnProperty.call(opts, 'tcfdt-cr')) {
      let cr = opts['tcfdt-cr'];
      if (isNaN(cr) || cr < 1 || cr > 21) {
        cr = 4.5;
      }
      document.getElementById('cr').value = cr;
    }
  });
  document.getElementById('setCR').addEventListener('click', () => {
    const newCR = parseFloat(document.getElementById('cr').value);

    browser.storage.local.set({'tcfdt-cr': newCR});
  });

  // Handle delay
  const opts = await browser.storage.local.get('tcfdt-dl');
  if ({}.hasOwnProperty.call(opts, 'tcfdt-dl')) {
    document.getElementById('delay').value = opts['tcfdt-dl'];
  }
  document.getElementById('setDelay').addEventListener('click', () => {
    let newDelay = document.getElementById('delay').value | 0;

    if (newDelay <= 0) {
      newDelay = 0;
    }

    browser.storage.local.set({'tcfdt-dl': newDelay});
  });

  // Handle list mode
  browser.storage.local.get('tcfdt-wlist').then((opts) => {
    if (opts['tcfdt-wlist']) {
      document.getElementById('wlist').checked = true;
      document.getElementById('list-mode-title').textContent = 'Enable';
    } else {
      document.getElementById('wlist').checked = false;
      document.getElementById('list-mode-title').textContent = 'Disable';
    }
  });

  document.getElementById('wlist').addEventListener('change', (e) => {
    const newMode = e.currentTarget.checked;

    if (newMode) {
      document.getElementById('list-mode-title').textContent = 'Enable';
    } else {
      document.getElementById('list-mode-title').textContent = 'Disable';
    }

    browser.storage.local.set({'tcfdt-wlist': newMode});
  });
}

window.addEventListener('load', main);
