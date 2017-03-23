/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* global getDefaultComputedStyle:false, color:false */
'use strict';

const kInputElems = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TOOLBARBUTTON'];
const kInvisibleElems = [
  'HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK', '#text',
  'FRAMESET',
];

const IFRAME_DELAY = 500;

let userInverted = false;

const port = browser.runtime.connect({name: 'port-from-cs'});

function setBadge(msg) {
  // Only top-level tab can set the badge
  if (window.self === window.top) {
    port.postMessage({badge: msg});
  }
}

function clear_overrides(doc) {
  const elems = doc.querySelectorAll('[data-_extension-text-contrast]');

  for (const e of elems) {
    e.removeAttribute('data-_extension-text-contrast');
  }
}

function isInputNode(node) {
  return kInputElems.indexOf(node.nodeName) > -1;
}

function isInVisibleNode(node) {
  return kInvisibleElems.indexOf(node.nodeName) > -1;
}

function is_subdoc(node) {
  if (node.contentDocument != null ||
    (node.getSVGDocument != null && node.getSVGDocument() != null)) {
    return true;
  }

  return false;
}

function get_subdoc(node) {
  if (node.contentDocument != null) {
    return node.contentDocument.documentElement;
  }

  if (node.getSVGDocument != null && node.getSVGDocument() != null) {
    return node.getSVGDocument().documentElement;
  }

  return null;
}

function is_fg_defined(e) {
  return getComputedStyle(e).color !== getDefaultComputedStyle(e).color;
}

function is_bg_defined(e) {
  return getComputedStyle(e).backgroundColor !==
    getDefaultComputedStyle(e).backgroundColor;
}

function is_bg_img_defined(e) {
  return getComputedStyle(e).backgroundImage !== 'none';
}

function fix_embeds(e) {
  const nodeIterator = document.createNodeIterator(
      e, NodeFilter.SHOW_ELEMENT, {acceptNode: is_subdoc});

  // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
  // Javascript.
  let node; // eslint-disable-line init-declarations

  while ((node = nodeIterator.nextNode()) != null) {
    if (node.contentDocument != null) {
      // Node is an <iframe> or <object> and has its own window, so message the
      // content script there that colors should be standard.
      node.contentWindow.postMessage('_tcfdt_subdoc', '*');
    }
    if (node.getSVGDocument != null && node.getSVGDocument() != null) {
      clear_overrides(node.getSVGDocument().documentElement);
      // Node is an <embed> SVG file, which will use the local stylesheet, so
      // set its dataset directly.
      node.getSVGDocument().documentElement.dataset._extensionTextContrast =
        'default';
    }
  }
}

function checkElementContrast(element, recurse) {
  if (element == null) {
    return;
  }

  // If element has already been examined before, don't do any processing
  if (element.dataset._extensionTextContrast != null) {
    return;
  }

  const fg_color_defined = is_fg_defined(element);
  const bg_color_defined = is_bg_defined(element);
  const bg_img_defined = is_bg_img_defined(element);

  if (fg_color_defined && bg_color_defined) {
    // Both colors explicitely defined, nothing to do
    element.dataset._extensionTextContrast = '';
    fix_embeds(element);

    return;
  } else if (!fg_color_defined && bg_color_defined) {
    // Only set fg if original contrast is poor
    const fg_color = color.to_rgb(getComputedStyle(element).color);
    const bg_color = color.to_rgb(getComputedStyle(element).backgroundColor);

    if (color.is_transparent(bg_color) ||
        !color.is_contrasty(fg_color, bg_color)) {
      element.dataset._extensionTextContrast = 'fg';
      fix_embeds(element);

      return;
    }
  } else if (fg_color_defined && !bg_color_defined) {
    // Only set bg if it will improve contrast
    const fg_color = color.to_rgb(getComputedStyle(element).color);
    const bg_color = color.to_rgb(getComputedStyle(element).backgroundColor);

    if (!color.is_contrasty(fg_color, bg_color)) {
      element.dataset._extensionTextContrast = 'bg';
      fix_embeds(element);

      return;
    }
  } else if (bg_img_defined) {
    const default_bg =
      color.to_rgb(getDefaultComputedStyle(element).backgroundColor);

    if (color.is_transparent(default_bg)) {
      // If the background is supposed to be transparent, keep the transparency
      // and only fix foreground
      element.dataset._extensionTextContrast = 'fg';
    } else {
      // No FG or BG color, but may have a transparent bg image. BG color is
      // not transparent, so need to set both colors.
      element.dataset._extensionTextContrast = 'both';
    }
    fix_embeds(element);

    return;
  }

  if (recurse === true) {
    const {children} = element;
    const len = children.length;

    for (let i = 0; i < len; i += 1) {
      // Don't look at non-renderable elements
      if (!isInVisibleNode(element.children[i])) {
        checkElementContrast(element.children[i], true);
      }
    }

    checkElementContrast(get_subdoc(element), true);
  }
}

function checkInputs(elem) {
  // Check all input elements under elem
  const nodeIterator = document.createNodeIterator(
      elem, NodeFilter.SHOW_ELEMENT, {acceptNode: isInputNode});

  // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
  // Javascript.
  let node; // eslint-disable-line init-declarations

  while ((node = nodeIterator.nextNode()) != null) {
    checkElementContrast(node, false);
  }
}

function checkDoc() {
  // Check from root recursively
  checkElementContrast(document.documentElement, true);

  // Other checks required when browser is in quirks mode
  if (document.compatMode === 'BackCompat') {
    // Tables don't inherit color
    const tables = document.getElementsByTagName('table');

    for (let i = 0; i < tables.length; i += 1) {
      if (getComputedStyle(tables[i]).color ===
          getDefaultComputedStyle(tables[i]).color) {
        // If color has not been set explicitely, then force inherit
        tables[i].style.color = 'inherit';
      }
    }
  }
}

function recolor_parent_check(elem) {
  if (userInverted === true) {
    let parent = elem.parentElement;
    let defined = false;

    while (parent !== null) {
      if (parent.dataset._extensionTextContrast != null) {
        // If any parents' were already handled,
        // new elements don't need recolor.
        defined = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (!defined) {
      checkElementContrast(elem, true);
    } else {
      setTimeout(() => {
        fix_embeds(elem);
      }, IFRAME_DELAY);
    }
  }
}

function updateUserInverted() {
  const defaultFg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).color);
  const defaultBg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).backgroundColor);

  if (!color.is_contrasty(defaultFg, {r: 255, g: 255, b: 255, a: 1}) ||
      !color.is_contrasty({r: 0, g: 0, b: 0, a: 1}, defaultBg)) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    userInverted = true;
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
    if (mutation.type === 'attributes') {
      // This mutation represents a change to class or style of element
      // so this element also needs re-checking
      const changedNode = mutation.target;

      if (isInputNode(changedNode)) {
        checkElementContrast(changedNode, false);
      }
      recolor_parent_check(changedNode);
    } else {
      for (const newNode of mutation.addedNodes) {
        // Check visibility of new nodes before furhter processing
        if (!isInVisibleNode(newNode)) {
          checkInputs(newNode);
          recolor_parent_check(newNode);
        }
      }
    }
  });
});

const config = {
  attributes:      true,
  attributeFilter: ['class'],
  childList:       true,
  subtree:         true,
};

function enableExtension(enable) {
  if (enable) {
    checkInputs(document.documentElement);
    if (userInverted === true) {
      checkDoc();
    }
    observer.observe(document, config);
    setBadge('');
  } else {
    clear_overrides(document);

    observer.disconnect();
    setBadge('off');
  }
}

function enableStandard(enable) {
  if (enable) {
    clear_overrides(document);

    // Force override on root element
    document.documentElement.dataset._extensionTextContrast = 'std';
    // Re-check all inputs
    checkInputs(document.documentElement);

    // Fix frames
    fix_embeds(document.documentElement);

    observer.observe(document, config);
    setBadge('std');
  } else {
    clear_overrides(document);
    enableExtension(true);
  }
}

function main() {
  // If we are in an iframe or embedded SVG
  if (window.self !== window.top && userInverted) {
    checkStandardList().then((e) => {
      if (!e) {
        enableExtension(true);
      } else {
        enableStandard(true);
      }
    });

    window.addEventListener('message', (e) => {
      if (e.data === '_tcfdt_subdoc') {
        // Since we are resetting to default, don't do any other processing.
        enableExtension(false);

        // Only set foreground color, since background may be transparent by
        // design.
        document.documentElement.dataset._extensionTextContrast = 'default';

        e.stopPropagation();
      }
    }, true);
  } else {
    checkStandardList().then((e) => {
      if (!e) {
        enableExtension(true);
      } else {
        enableStandard(true);
      }
    });
  }
}

updateUserInverted();

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

checkDisabledList().then((e) => {
  if (!e) {
    main();
  }
});
