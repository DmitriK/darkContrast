/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals color:false, contrast:false */
'use strict';

const port = browser.runtime.connect({name: 'port-from-cs'});

function setBadge(msg) {
  // Only top-level tab can set the badge
  if (window.self === window.top) {
    port.postMessage({badge: msg});
  }
}

function checkDisabledList() {
  return browser.storage.local.get('tcfdt-list-disabled').then((obj) => {
    if ({}.hasOwnProperty.call(obj, 'tcfdt-list-disabled')) {
      const list = obj['tcfdt-list-disabled'];

      for (const i in list) {
        if ({}.hasOwnProperty.call(list, i)) {
          const check = list[i];

          if (check === '') {
            continue;
          }

          if (window.location.href.indexOf(check) !== -1) {
            return true;
          }
        }
      }
    }

    return false;
  });
}

function checkStandardList() {
  return browser.storage.local.get('tcfdt-list-standard').then((obj) => {
    if ({}.hasOwnProperty.call(obj, 'tcfdt-list-standard')) {
      const list = obj['tcfdt-list-standard'];

      for (const i in list) {
        if ({}.hasOwnProperty.call(list, i)) {
          const check = list[i];

          if (check === '') {
            continue;
          }

          if (window.location.href.indexOf(check) !== -1) {
            return true;
          }
        }
      }
    }

    return false;
  });
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' &&
        mutation.attributeName === 'data-_extension-text-contrast' &&
        mutation.oldValue !== null) {
      // Something in the author JS has erased the previous attribute, so
      // restore it.
      mutation.target.dataset._extensionTextContrast = mutation.oldValue;
    } else if (mutation.type === 'attributes') {
      // This mutation represents a change to class or style of element
      // so this element also needs re-checking
      const changedNode = mutation.target;

      if (contrast.isInputNode(changedNode)) {
        contrast.checkElement(changedNode);
      }
      contrast.recolor_parent_check(changedNode);
    } else {
      for (const newNode of mutation.addedNodes) {
        // Check visibility of new nodes before further processing
        if (!contrast.isInVisibleNode(newNode)) {
          contrast.checkInputs(newNode);
          contrast.recolor_parent_check(newNode);
        }
      }
    }
  });
});

const config = {
  attributes:        true,
  attributeFilter:   ['class', 'style', 'data-_extension-text-contrast'],
  childList:         true,
  subtree:           true,
  attributeOldValue: true,
};

function enableExtension(enable) {
  if (enable) {
    contrast.checkInputs(document.documentElement);
    if (contrast.userInverted === true) {
      contrast.checkDoc();
    }
    observer.observe(document, config);
    setBadge('');
  } else {
    observer.disconnect();
    contrast.clear_overrides(document);
    contrast.fix_embeds(document.documentElement, 'clr');

    setBadge('off');
  }
}

function enableStandard(enable) {
  if (enable) {
    // Must stop observing when clearing overrides to prevent self-restoration
    observer.disconnect();
    contrast.clear_overrides(document);

    // Force override on root element
    document.documentElement.dataset._extensionTextContrast = 'std';
    // Re-check all inputs
    contrast.checkInputs(document.documentElement);

    // Fix frames
    contrast.fix_embeds(document.documentElement, 'std');

    observer.observe(document, config);
    setBadge('std');
  } else {
    // Must stop observing when clearing overrides to prevent self-restoration
    observer.disconnect();
    contrast.clear_overrides(document);
    observer.observe(document, config);
    enableExtension(true);
  }
}

async function init() {
  let opts = await browser.storage.local.get('tcfdt-cr');

  if ({}.hasOwnProperty.call(opts, 'tcfdt-cr')) {
    color.setContrastRatio(opts['tcfdt-cr']);
  }

  contrast.updateUserInverted();

  opts = await browser.storage.local.get('tcfdt-dl');

  if ({}.hasOwnProperty.call(opts, 'tcfdt-dl')) {
    const delay = opts['tcfdt-dl'] | 0;

    if (delay !== 0) {
      const prDelay = new Promise((resolve) => {
        setTimeout(resolve, delay);
      });

      await prDelay;
    }
  }

  const disabled = await checkDisabledList();

  if (!disabled) {
    const standard = await checkStandardList();

    if (standard) {
      enableStandard(true);
    } else {
      enableExtension(true);
    }
  }
}

init();

browser.runtime.onMessage.addListener((message) => {
  if (message.request === 'toggle') {
    const elems = document.querySelectorAll('[data-_extension-text-contrast]');

    if (elems.length === 0) {
      enableExtension(true);
    } else {
      enableExtension(false);
    }
  } else if (message.request === 'std') {
    if (document.documentElement.dataset._extensionTextContrast === 'std') {
      enableStandard(false);
    } else {
      enableStandard(true);
    }
  }
});

