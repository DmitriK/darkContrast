/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* global getDefaultComputedStyle:false, color:false */
'use strict';

const kInputElems = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TOOLBARBUTTON'];
const kInvisibleElems = [
  'HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK', '#text',
  'FRAMESET',
];

let userInverted = false;

{
  const defaultFg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).color);
  const defaultBg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).backgroundColor);

  if (!color.is_contrasty(defaultFg, {r:255, g:255, b:255, a:1}) ||
      !color.is_contrasty({r:0, g:0, b:0, a:1}, defaultBg)) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    userInverted = true;
  }
}

function isInputNode(node) {
  return kInputElems.indexOf(node.nodeName) > -1;
}

function isInVisibleNode(node) {
  return kInvisibleElems.indexOf(node.nodeName) > -1;
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

function checkElementContrast(element, recurse) {
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

    return;
  } else if (!fg_color_defined && bg_color_defined) {
    // Only set fg if original contrast is poor
    const fg_color = color.to_rgb(getComputedStyle(element).color);
    const bg_color = color.to_rgb(getComputedStyle(element).backgroundColor);

    if (color.is_transparent(bg_color) ||
        !color.is_contrasty(fg_color, bg_color)) {
      element.dataset._extensionTextContrast = 'fg';

      return;
    }
  } else if (fg_color_defined && !bg_color_defined) {
    // Only set bg if it will improve contrast
    const fg_color = color.to_rgb(getComputedStyle(element).color);
    const bg_color = color.to_rgb(getComputedStyle(element).backgroundColor);

    if (!color.is_contrasty(fg_color, bg_color)) {
      element.dataset._extensionTextContrast = 'bg';

      return;
    }
  } else if (bg_img_defined) {
    // No FG or BG color, but possibly transparent image, so need
    // to set both
    element.dataset._extensionTextContrast = 'both';

    return;
  }

  if (recurse === true) {
    const {children} = element;

    for (let i = 0; i < children.length; i += 1) {
      // Don't look at non-renderable elements
      if (!isInVisibleNode(element.children[i])) {
        checkElementContrast(element.children[i], true);
      }
    }
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
    }
  }
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.request === 'toggle') {
    const elems = document.querySelectorAll('[data-_extension-text-contrast]');

    if (elems.length === 0) {
      checkInputs(document.documentElement);
      if (userInverted === true) {
        checkDoc();
      }
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({toggle: true});
      }
    } else {
      for (const e of elems) {
        e.removeAttribute('data-_extension-text-contrast');
      }
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({toggle: false});
      }
    }
  } else if (message.request === 'std') {
    if (document.documentElement.dataset._extensionTextContrast === 'std') {
      // Clear overrides
      const elems =
        document.querySelectorAll('[data-_extension-text-contrast]');

      for (const e of elems) {
        e.removeAttribute('data-_extension-text-contrast');
      }
      // Re-check everything
      checkInputs(document.documentElement);
      if (userInverted === true) {
        checkDoc();
      }
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({std: false});
      }
    } else {
      // Clear overrides
      const elems =
        document.querySelectorAll('[data-_extension-text-contrast]');

      for (const e of elems) {
        e.removeAttribute('data-_extension-text-contrast');
      }
      // Force override on root element
      document.documentElement.dataset._extensionTextContrast = 'std';
      // Re-check all inputs
      checkInputs(document.documentElement);
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({std: true});
      }
    }
  }
});

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
  attributes: true,
  attributeFilter: ['class'],
  childList: true,
  subtree: true,
};

// Delay action slightly to allow other addons to inject css (e.g. dotjs)
setTimeout(() => {
  checkInputs(document.documentElement);
  if (userInverted === true) {
    checkDoc();
  }
  observer.observe(document, config);
}, 32);
