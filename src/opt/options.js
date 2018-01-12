/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
'use strict';

const {storage} = browser;

function main() {
  storage.local.get({
    'tcfdt-cr':            4.5,
    'tcfdt-list-disabled': [],
    'tcfdt-list-standard': [],
    'tcfdt-wlist':         false,
    'tcfdt-dl':            0,
  })
    .then((opts) => {
      // Load everything from storage
      // Lists...
      document.getElementById('blacklist').value =
        opts['tcfdt-list-disabled'].join('\n');
      document.getElementById('standardlist').value =
        opts['tcfdt-list-standard'].join('\n');

      // Contrast ratio...
      let cr = opts['tcfdt-cr'];

      if (isNaN(cr) || cr < 1 || cr > 21) {
        cr = 4.5;
      }
      document.getElementById('cr').value = cr;

      // Delay...
      document.getElementById('delay').value = opts['tcfdt-dl'];

      // List mode...
      if (opts['tcfdt-wlist']) {
        document.getElementById('wlist').checked = true;
        document.getElementById('list-mode-title').textContent = 'Enable';
      } else {
        document.getElementById('wlist').checked = false;
        document.getElementById('list-mode-title').textContent = 'Disable';
      }
    })
    .then(() => {
      // Set event listeners
      // Lists...
      document.getElementById('save-dis').addEventListener('click', () => {
        const lines =
          document.getElementById('blacklist').value
            .split('\n')
            .filter(s => s.trim() !== "");

        if (lines.length === 0) {
          storage.local.remove('tcfdt-list-disabled');
        } else {
          storage.local.set({'tcfdt-list-disabled': lines});
        }
      });

      document.getElementById('save-std').addEventListener('click', () => {
        const lines =
          document.getElementById('standardlist').value
            .split('\n')
            .filter(s => s.trim() !== "");

        if (lines.length === 0) {
          storage.local.remove('tcfdt-list-standard');
        } else {
          storage.local.set({'tcfdt-list-standard': lines});
        }
      });

      document.getElementById('revert-dis').addEventListener('click', () => {
        document.getElementById('blacklist').value = '';
        storage.local.get({'tcfdt-list-disabled': []}).then((opts) => {
          document.getElementById('blacklist').value =
            opts['tcfdt-list-disabled'].join('\n');
        });
      });

      document.getElementById('revert-std').addEventListener('click', () => {
        document.getElementById('standardlist').value = '';
        storage.local.get({'tcfdt-list-standard': []}).then((opts) => {
          document.getElementById('standardlist').value =
            opts['tcfdt-list-standard'].join('\n');
        });
      });

      // Contrast ratio...
      document.getElementById('setCR').addEventListener('click', () => {
        const newCR = parseFloat(document.getElementById('cr').value);

        storage.local.set({'tcfdt-cr': newCR});
      });

      // Delay...
      document.getElementById('setDelay').addEventListener('click', () => {
        let newDelay = document.getElementById('delay').value | 0;

        if (newDelay <= 0) {
          newDelay = 0;
        }

        browser.storage.local.set({'tcfdt-dl': newDelay});
      });

      // List mode...
      document.getElementById('wlist').addEventListener('change', (e) => {
        const newMode = e.currentTarget.checked;

        if (newMode) {
          document.getElementById('list-mode-title').textContent = 'Enable';
        } else {
          document.getElementById('list-mode-title').textContent = 'Disable';
        }

        browser.storage.local.set({'tcfdt-wlist': newMode});
      });
    })
    .then(() => {
      // Enable inputs
      // Lists...
      document.getElementById('blacklist').disabled = false;
      document.getElementById('standardlist').disabled = false;
      document.getElementById('save-dis').disabled = false;
      document.getElementById('save-std').disabled = false;
      document.getElementById('revert-dis').disabled = false;
      document.getElementById('revert-std').disabled = false;

      // Contrast ratio...
      document.getElementById('cr').disabled = false;
      document.getElementById('setCR').disabled = false;

      // Delay...
      document.getElementById('delay').disabled = false;
      document.getElementById('setDelay').disabled = false;

      // List mode...
      document.getElementById('wlist').disabled = false;
    });
}

window.addEventListener('load', main);
