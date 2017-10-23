/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals getDefaultComputedStyle:false */
'use strict';

let constrastRatio = 4.5;

const INPUT_NODE_NAMES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

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

const checkElement = (el) => {
  // If element has already been examined before, don't do any processing
  if (el.dataset._extensionTextContrast != null) {
    return;
  }

  const fgClrDefined = isFgDefined(el);
  const bgClrDefined = isBgDefined(el);
  const bgImgDefined = isBgImgDefined(el);

  if (fgClrDefined && bgClrDefined) {
    // Both colors explicitly defined, nothing to do
    el.dataset._extensionTextContrast = '';
  } else if (!fgClrDefined && bgClrDefined) {
    // Only set fg if original contrast is poor
    const fg = toRGB(getComputedStyle(el).color);
    const bg = toRGB(getComputedStyle(el).backgroundColor);

    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'fg';
    }
  } else if (fgClrDefined && !bgClrDefined) {
    // Only set bg if it will improve contrast
    const fg = toRGB(getComputedStyle(el).color);
    const bg = toRGB(getComputedStyle(el).backgroundColor);

    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'bg';
    }
  } else if (bgImgDefined) {
    // No FG or BG color, but may have a transparent bg image. BG color is
    // not transparent, so need to set both colors.
    el.dataset._extensionTextContrast = 'both';
  }
};

const isInput = (node) => INPUT_NODE_NAMES.indexOf(node.nodeName) > -1;

const checkInputs = (root = document) => {
  // Check all input elements under elem
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_ELEMENT,
    {acceptNode: isInput},
  );

  // Can't use for-of loop because a NodeIterator is not iteratable.
  // Thanks Javascript!
  let node = null;

  while ((node = nodeIterator.nextNode()) != null) {
    checkElement(node);
  }
};

browser.storage.local.get({'tcfdt-cr': 4.5}).then((items) => {
  constrastRatio = items['tcfdt-cr'];
  checkInputs();

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

        if (isInput(changedNode)) {
          checkElement(changedNode);
        }
      } else {
        for (const newNode of mutation.addedNodes) {
          checkInputs(newNode);
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
