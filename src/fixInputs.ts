/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

import { isContrasty, setContrastRatio, toRGB } from './lib/color';
import { isFgDefined, isBgDefined, isBgImgDefined, isInputNode } from './lib/checks';
import { clearOverrides } from './lib/contrast';

const checkElement = (el: HTMLElement): void => {
  // If element has already been examined before, don't do any processing
  if ('_extensionTextContrast' in el.dataset) {
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
    const fg = toRGB(getComputedStyle(el).getPropertyValue('color'));
    const bg = toRGB(getComputedStyle(el).getPropertyValue('background-color'));

    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'fg';
    }
  } else if (fgClrDefined && !bgClrDefined) {
    // Only set bg if it will improve contrast
    const fg = toRGB(getComputedStyle(el).getPropertyValue('color'));
    const bg = toRGB(getComputedStyle(el).getPropertyValue('background-color'));

    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'bg';
    }
  } else if (bgImgDefined) {
    // No FG or BG color, but may have a transparent bg image. BG color is
    // not transparent, so need to set both colors.
    el.dataset._extensionTextContrast = 'both';
  }
};

const checkInputs = (root: Element = document.documentElement) => {
  // Check all input elements
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (el: HTMLElement) =>
        isInputNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  );

  // Can't use for-of loop because a NodeIterator is not iterable.
  // Thanks Javascript!
  let node = null;

  while ((node = nodeIterator.nextNode()) != null) {
    checkElement(node as HTMLElement);
  }
};

browser.storage.local.get({'tcfdt-cr': 4.5}).then((items) => {
  setContrastRatio(items['tcfdt-cr']);
  checkInputs();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' &&
          mutation.attributeName === 'data-_extension-text-contrast' &&
          mutation.oldValue !== null) {
        // Something in the author JS has erased the previous attribute, so
        // restore it.
        const element = mutation.target as HTMLElement;
        element.dataset._extensionTextContrast = mutation.oldValue;
      } else if (mutation.type === 'attributes') {
        // This mutation represents a change to class or style of element
        // so this element also needs re-checking
        const changedNode = mutation.target as HTMLElement;

        if (isInputNode(changedNode)) {
          checkElement(changedNode);
        }
      } else {
        for (const newNode of mutation.addedNodes) {
          checkInputs(newNode as Element);
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

  browser.runtime.onMessage.addListener((message: {}) => {
    const request = (message as {request: 'off'}).request;
    if (request === 'off') {
      observer.disconnect();
      clearOverrides(document);
    }
  });
});
