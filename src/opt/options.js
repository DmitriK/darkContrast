/* globals browser*/

'use strict';

function populateEntries() {
  browser.storage.local.get("exclude").then((item) => {

  });
}

function main() {
  populateEntries();

  document.getElementById('save-btn').addEventListener('click', (e) => {
    lines = e.target.value;

    browser.storage.local.set("exclude");

    populateEntries();
  });

  document.getElementById('revert-btn').addEventListener('click', () => {
    document.getElementById('entry-name').value = '';
    populateEntries();
  });
}

window.addEventListener('load', main);
