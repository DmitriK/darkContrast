/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals contrast:false */
'use strict';

if (window.self !== window.top) {
  window.addEventListener('message', (e) => {
    if (e.data === '_tcfdt_subdoc_std') {
      browser.runtime.sendMessage({frame: 'std'});
      contrast.fix_embeds(document.documentElement, 'std');
    } else if (e.data === '_tcfdt_subdoc_fix') {
      browser.runtime.sendMessage({frame: 'fix'});
    } else if (e.data === '_tcfdt_subdoc_clr') {
      browser.runtime.sendMessage({frame: 'clr'});
    }
    e.stopPropagation();
  }, true);
}
