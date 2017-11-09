/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals getDefaultComputedStyle:false */
'use strict';

let constrastRatio = 4.5;

const INVISIBLE_NODES = [
  'HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK', '#text',
  'FRAMESET',
];
const INPUT_NODE_NAMES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

const SUBDOC_NODES = ['IFRAME', 'SVG', 'OBJECT', 'EMBED', 'FRAME'];

const isFgDefined =
  (e) => getComputedStyle(e).color !== getDefaultComputedStyle(e).color;

const isBgDefined = (e) => getComputedStyle(e).backgroundColor !==
  getDefaultComputedStyle(e).backgroundColor;

const isBgImgDefined = (e) => getComputedStyle(e).backgroundImage !== 'none';

const toRGB = (s) => {
  if (s === 'transparent') {
    return {r: 0, g: 0, b: 0, a: 0};
  }

  const rgb = {};
  const parts = s.split(',', 4);

  rgb.r = parseInt(parts[0].substr(parts[0].indexOf('(', 3) + 1), 10);
  rgb.g = parseInt(parts[1].trim(), 10);
  rgb.b = parseInt(parts[2].trim(), 10);
  if (parts[3] == null) {
    rgb.a = 1;
  } else {
    rgb.a = parseInt(parts[3].trim(), 10);
  }

  return rgb;
};

const getIntensity = (srgb) => {
  const rgbNormalized = [srgb.r / 255.0, srgb.g / 255.0, srgb.b / 255.0];
  const rgbLin = rgbNormalized.map((v) => {
    if (v <= 0.03928) {
      return v / 12.92;
    }

    return Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rgbLin[0] + 0.7152 * rgbLin[1] + 0.0722 * rgbLin[2];
};

const isContrasty = (fg, bg) => {
  const lumF = getIntensity(fg);
  const lumB = getIntensity(bg);

  const L1 = Math.max(lumF, lumB);
  const L2 = Math.min(lumF, lumB);

  return (L1 + 0.05) / (L2 + 0.05) > constrastRatio;
};

const isTransparent = (rgb) => rgb.a === 0;

const isInVisibleNode = (node) => INVISIBLE_NODES.indexOf(node.nodeName) > -1;
const isInputNode = (node) => INPUT_NODE_NAMES.indexOf(node.nodeName) > -1;
const isSubDocNode = (node) => SUBDOC_NODES.indexOf(node.nodeName) > -1;

const checkElement = (el, {recurse, parentFg, parentBg} =
                      {recurse: false, parentFg: null, parentBg: null}) => {
  if (el == null) {
    return;
  }

  // If element has already been examined before, don't do any processing
  if (el.dataset._extensionTextContrast != null) {
    return;
  }

  const fgClrDefined = isFgDefined(el);
  const bgClrDefined = isBgDefined(el);
  const bgImgDefined = isBgImgDefined(el);
  const fgParentDefined = parentFg != null;
  const bgParentDefined = parentBg != null;

  if ((fgClrDefined || fgParentDefined) &&
      (bgClrDefined || bgParentDefined)) {
    // Both colors explicitly defined, nothing to do
    el.dataset._extensionTextContrast = '';

    return;
  } else if (!(fgClrDefined || fgParentDefined) &&
             (bgClrDefined || bgParentDefined)) {
    const fg = toRGB(getComputedStyle(el).color);
    const bg = bgClrDefined
      ? toRGB(getComputedStyle(el).backgroundColor)
      : parentBg;

    // Note that if background image exists, it may not be transparent, so we
    // can't afford to skip setting the color
    if (!isContrasty(fg, bg) || bgImgDefined) {
      el.dataset._extensionTextContrast = 'fg';

      return;
    }

    // Otherwise, propagate the background color if it isn't transparent
    if (bgClrDefined && !isTransparent(bg)) {
      parentBg = bg;
    }
  } else if ((fgClrDefined || fgParentDefined) &&
             !(bgClrDefined || bgParentDefined)) {
    const fg = fgClrDefined
      ? toRGB(getComputedStyle(el).color)
      : parentFg;
    const bg = toRGB(getComputedStyle(el).backgroundColor);

    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'bg';

      return;
    }

    if (fgClrDefined && !isTransparent(fg)) {
      parentFg = fg;
    }
  } else if (bgImgDefined) {
    const defaultBg = toRGB(getDefaultComputedStyle(el).backgroundColor);

      // No FG or BG color, but may have a transparent bg image, set both colors
      el.dataset._extensionTextContrast = 'both';

    return;
  }

  // If here, then either no colors were defined, or those that were still have
  // contrast. Need to continue checking child elements to ensure contrast is OK

  if (recurse === true) {
    const {children} = el;
    const len = children.length;

    for (let i = 0; i < len; i += 1) {
      // Don't look at non-renderable elements
      if (!isInVisibleNode(el.children[i])) {
        checkElement(el.children[i], {recurse, parentFg, parentBg});
      }
    }
  }
};

const checkInputs = (root = document) => {
  // Check all input elements
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_ELEMENT,
    {acceptNode: isInputNode},
  );

  // Can't use for-of loop because a NodeIterator is not iteratable.
  // Thanks Javascript!
  let node = null;

  while ((node = nodeIterator.nextNode()) != null) {
    checkElement(node);
  }
};

const checkAll = () => {
  // Recursively check the document
  checkElement(document.documentElement, {recurse: true});

  // Check input after
  checkInputs();
};

const checkParents = (el) => {
  let parent = el.parentElement;
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
    checkElement(el, {recurse: true});
  }
};

const stdEmbeds = (e) => {
  const nodeIterator = document.createNodeIterator(
    e, NodeFilter.SHOW_ELEMENT, {acceptNode: isSubDocNode});

  // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
  // Javascript.
  let node; // eslint-disable-line init-declarations

  while ((node = nodeIterator.nextNode()) != null) {
    node.contentWindow.postMessage('_tcfdt_subdoc_std', '*');
  }
};

browser.storage.local.get({'tcfdt-cr': 4.5}).then((items) => {
  /*if (window.self !== window.top) {
    window.addEventListener('message', (e) => {
      if (e.data === '_tcfdt_subdoc_std') {
        browser.runtime.sendMessage({frame: 'std'});
        contrast.fix_embeds(document.documentElement, 'std');
      }
      e.stopPropagation();
    }, true);
  }*/

  constrastRatio = items['tcfdt-cr'];
  checkAll();

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

        checkParents(changedNode);

        if (isInputNode(changedNode)) {
          checkElement(changedNode);
        }
      } else {
        for (const newNode of mutation.addedNodes) {
          if (!isInVisibleNode(newNode)) {
            checkParents(newNode);
            checkInputs(newNode);
          }
        }
      }
    });
  });

  const observerConf = {
    attributes:        true,
    attributeFilter:   ['class', 'style', 'data-_extension-text-contrast'],
    childList:         true,
    subtree:           true,
    attributeOldValue: true,
  };

  observer.observe(document, observerConf);
});
