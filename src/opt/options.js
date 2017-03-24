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

function main() {
  populateDisabled();
  populateStandard();

  document.getElementById('save-dis').addEventListener('click', () => {
    const lines = document.getElementById('blacklist').value.split('\n');

    browser.storage.local.set({'tcfdt-list-disabled': lines});
  });

  document.getElementById('save-std').addEventListener('click', () => {
    const lines = document.getElementById('standardlist').value.split('\n');

    browser.storage.local.set({'tcfdt-list-standard': lines});
  });

  document.getElementById('revert-dis').addEventListener('click', () => {
    document.getElementById('blacklist').value = '';
    populateDisabled();
  });

  document.getElementById('revert-std').addEventListener('click', () => {
    document.getElementById('standardlist').value = '';
    populateStandard();
  });
}

window.addEventListener('load', main);
