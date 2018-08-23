/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

import { getParentBg, getParentFg, isContrasty, isTransparent, setContrastRatio, toRGB } from './lib/color';
import { INPUT_NODES, isInputNode } from './lib/checks';
import { clearOverrides } from './lib/contrast';

declare function requestIdleCallback(callback: () => any, options?: { timeout: number }): CSSStyleDeclaration;

let DEFAULTS: { [key:string]: {fg:string, bg:string} } = {};

let probe_frame = document.createElementNS('http://www.w3.org/1999/xhtml', 'iframe') as HTMLIFrameElement;
probe_frame.src = 'about:blank';
probe_frame.style.display = 'none';
document.body.appendChild(probe_frame);
let frame_doc = probe_frame.contentWindow!.document;
// DEFAULTS['html'] = {fg: getComputedStyle(frame_doc.body).getPropertyValue('color'), bg: getComputedStyle(frame_doc.body).getPropertyValue('background-color')};
// Get default browser style, which should be the final non-transparent color
frame_doc.body.style.color = '-moz-default-color';
frame_doc.body.style.backgroundColor = '-moz-default-background-color';
DEFAULTS['browser'] = {fg: getComputedStyle(frame_doc.body).getPropertyValue('color'), bg: getComputedStyle(frame_doc.body).getPropertyValue('background-color')};

for (const node of INPUT_NODES) {
  let probe = frame_doc.createElement(node);
  frame_doc.body.appendChild(probe);

  DEFAULTS[node] = {fg: getComputedStyle(probe).getPropertyValue('color'), bg: getComputedStyle(probe).getPropertyValue('background-color')}
}
document.body.removeChild(probe_frame);

const checkElement = (el: HTMLElement): void => {
  // If element has already been examined before, don't do any processing
  if ('_extensionTextContrast' in el.dataset) {
    return;
  }

  // Grab current and default styles
  const compStyle = getComputedStyle(el);
  let fg = compStyle.getPropertyValue('color');
  let bg = compStyle.getPropertyValue('background-color');
  const fg_default = DEFAULTS[el.nodeName].fg;
  const bg_default = DEFAULTS[el.nodeName].bg;

  // Check which styles have been overriden by site author
  const fgClrDefined = fg !== fg_default;
  const bgClrDefined = bg !== bg_default;
  const bgImgDefined = compStyle.getPropertyValue('background-image') !== 'none';

  // Normalize styles (which could be something like 'transparent') to true rgba
  // values.
  let fg_rgba = toRGB(fg);
  let bg_rgba = toRGB(bg);

  // If color is transparent, recurse through all the parents to find a
  // non-transparent color to assume as the current color
  if (isTransparent(fg_rgba)) {
    fg_rgba = getParentFg(el, toRGB(DEFAULTS['browser'].fg));
  }
  if (isTransparent(bg_rgba)) {
    bg_rgba = getParentBg(el, toRGB(DEFAULTS['browser'].bg));
  }

  if (fgClrDefined && bgClrDefined) {
    // Both colors explicitly defined, nothing to do
    el.dataset._extensionTextContrast = '';
  } else if (!fgClrDefined && bgClrDefined) {
    // Only set fg if original contrast is poor
    if (!isContrasty(fg_rgba, bg_rgba)) {
      el.dataset._extensionTextContrast = 'fg';
    }
  } else if (fgClrDefined && !bgClrDefined) {
    // Only set bg if it will improve contrast
    if (!isContrasty(fg_rgba, bg_rgba)) {
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

browser.storage.local.get({ 'tcfdt-cr': 4.5 }).then((items) => {
  setContrastRatio(items['tcfdt-cr']);
  checkInputs();

  const dataObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.oldValue !== null) {
        // Something in the author JS has erased the previous attribute, so
        // restore it.
        const element = mutation.target as HTMLElement;
        element.dataset._extensionTextContrast = mutation.oldValue;
      }
    });
  });

  const observer = new MutationObserver((mutations) => {
    const mutLen = mutations.length;
    for (let i = 0; i < mutLen; i += 1) {
      if (mutations[i].type === 'attributes') {
        // This mutation represents a change to class or style of element
        // so this element also needs re-checking
        const changedNode = mutations[i].target as HTMLElement;

        if (isInputNode(changedNode)) {
          requestIdleCallback(() => { checkElement(changedNode); });
        }
      } else if (mutations[i].type === 'childList') {
        const addLen = mutations[i].addedNodes.length;
        for (let j = 0; j < addLen; j += 1) {
          requestIdleCallback(() => { checkInputs(mutations[i].addedNodes[j] as Element); });
        }
      }
    }
  });

  observer.observe(document, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    childList: true,
    subtree: true,
  });

  dataObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-_extension-text-contrast'],
    subtree: true,
    attributeOldValue: true,
  });

  browser.runtime.onMessage.addListener((message: {}) => {
    const request = (message as { request: 'off' }).request;
    if (request === 'off') {
      dataObserver.disconnect();
      clearOverrides(document);
    }
  });
});
