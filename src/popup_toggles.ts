/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

const { runtime, storage, tabs } = browser;

let toggle_on = () => {
  browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
      runtime.sendMessage('', {request: 'on', allFrames: true, tabId: tabs[0].id});
    });
};

let toggle_off = () => {
  browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
      runtime.sendMessage('', {request: 'off', allFrames: true, tabId: tabs[0].id});
    });
};

window.addEventListener('load', () => {
  (document.getElementById('tog_std') as HTMLButtonElement).addEventListener('click', () => {
     tabs.query({currentWindow: true, active: true}).then((tabs) => {
       runtime.sendMessage('', {request: 'std', allFrames: true, tabId: tabs[0].id});
     });
  });

  (document.getElementById('open_opts') as HTMLButtonElement).addEventListener('click', () => {
    runtime.openOptionsPage();
  });

  storage.local.get('tcfdt-wlist').then((opts) => {
    let wList: boolean = opts['tcfdt-wlist'] as boolean;

    let el = document.getElementById('listKind') as HTMLSpanElement;

    el.textContent = wList ? 'white' : 'black';

    el = document.getElementById('togModeTxt') as HTMLSpanElement;
    el.textContent = wList ? 'on' : 'off';

    // Change what toggle button callback does
    (document.getElementById('tog_main') as HTMLButtonElement).addEventListener('click', wList ? toggle_on : toggle_off);
  });

  tabs.query({currentWindow: true, active: true}).then((tabs) => {
    let url: string = tabs[0].url!;

    let locProbe = document.createElement('a');
    locProbe.href = url;

    let host = locProbe.hostname;
    let path = `${host}${locProbe.pathname}`;

    document.querySelectorAll('.hostEx').forEach((el) => {
      el.textContent = host;
    });
    document.querySelectorAll('.pathEx').forEach((el) => {
      el.textContent = path;
    });
    document.querySelectorAll('.fullEx').forEach((el) => {
      el.textContent = url;
    });

    for (let id of [
         'add_hst_ovr', 'add_pth_ovr', 'add_url_ovr',
         'add_hst_std', 'add_pth_std', 'add_url_std',
         ]) {
      let btn = (document.getElementById(id) as HTMLButtonElement);
      btn.addEventListener('click', (e: Event) => {
        let idStr: string = (e.target as HTMLButtonElement).id;
        let [, part, list] = idStr.split('_');

        let entry: string;

        if (part === 'hst') {
          entry = host;
        } else if (part === 'pth') {
          entry = path;
        } else if (part === 'url') {
          entry = url;
        } else {
          return;
        }

        let tObj: 'tcfdt-list-standard' | 'tcfdt-list-disabled';

        if (list === 'std') {
          tObj = 'tcfdt-list-standard';
        } else if (list === 'ovr') {
          tObj = 'tcfdt-list-disabled';
        } else {
          return;
        }

        storage.local.get(tObj).then((opts) => {
          let list: string[] = [];
          if (tObj in opts) {
            list = opts[tObj] as string[];
          }
          if (list.indexOf(entry) === -1) {
            list.push(entry);
          }
          let newStore: {[key: string] : string[]} = {};
          newStore[tObj] = list;
          storage.local.set(newStore);
        });
      });
    }
  });
});
