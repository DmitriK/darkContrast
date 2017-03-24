/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
'use strict';

if (window.self !== window.top) {
  window.addEventListener('message', (e) => {
    if (e.data === '_tcfdt_subdoc_std') {
      browser.runtime.sendMessage({frame: 'std'});
      e.stopPropagation();
    } else if (e.data === '_tcfdt_subdoc_fix') {
      browser.runtime.sendMessage({frame: 'fix'});
      e.stopPropagation();
    } else if (e.data === '_tcfdt_subdoc_clr') {
      browser.runtime.sendMessage({frame: 'clr'});
      e.stopPropagation();
    }
  }, true);
}
