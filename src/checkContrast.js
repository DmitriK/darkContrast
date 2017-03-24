/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* global getDefaultComputedStyle:false, color:false */
/* globals contrast */
'use strict';

{
  const defaultFg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).color);
  const defaultBg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).backgroundColor);

  if (!color.is_contrasty(defaultFg, {r: 255, g: 255, b: 255, a: 1}) ||
      !color.is_contrasty({r: 0, g: 0, b: 0, a: 1}, defaultBg)) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    contrast.userInverted = true;
  }
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.request === 'toggle') {
    const elems = document.querySelectorAll('[data-_extension-text-contrast]');

    if (elems.length === 0) {
      contrast.checkInputs(document.documentElement);
      if (contrast.userInverted === true) {
        contrast.checkDoc();
      }
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({toggle: true});
      }
    } else {
      contrast.clear_overrides(document);
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({toggle: false});
      }
    }
  } else if (message.request === 'std') {
    if (document.documentElement.dataset._extensionTextContrast === 'std') {
      contrast.clear_overrides(document);

      // Re-check everything
      contrast.checkInputs(document.documentElement);
      if (contrast.userInverted === true) {
        contrast.checkDoc();
      }
      if (window.self === window.top) {
        // Only respond if top-level window, not frame
        sendResponse({std: false});
      }
    } else {
      contrast.clear_overrides(document);

      // Force override on root element
      document.documentElement.dataset._extensionTextContrast = 'std';
      // Re-check all inputs
      contrast.checkInputs(document.documentElement);
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

      if (contrast.isInputNode(changedNode)) {
        contrast.checkElement(changedNode, false);
      }
      contrast.recolor_parent_check(changedNode);
    } else {
      for (const newNode of mutation.addedNodes) {
        // Check visibility of new nodes before furhter processing
        if (!contrast.isInVisibleNode(newNode)) {
          contrast.checkInputs(newNode);
          contrast.recolor_parent_check(newNode);
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


// Delay action slightly to allow other addons to inject css (e.g. dotjs)
setTimeout(() => {
  contrast.checkInputs(document.documentElement);
  if (contrast.userInverted === true) {
    contrast.checkDoc();
  }
  observer.observe(document, config);
}, 32);
