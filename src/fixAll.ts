/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals getDefaultComputedStyle:false */

import { isContrasty, isTransparent, setContrastRatio, Srgb, toRGB } from './lib/color';
import { isFgDefined, isBgDefined, isBgImgDefined, isInputNode, isInVisibleNode, isSubDocNode } from './lib/checks';
import { clearOverrides } from './lib/contrast';

declare function getDefaultComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;

declare function requestIdleCallback(callback: (idleDeadline: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => any, options?: {timeout: number}): number;

let probe = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
probe.style.color = '-moz-default-color';
probe.style.backgroundColor = '-moz-default-background-color';

const DEFAULT_FG = toRGB(getComputedStyle(probe).getPropertyValue('color'));
const DEFAULT_BG = toRGB(getComputedStyle(probe).getPropertyValue('background-color'));

let topElementFixed = false;

const getParentFg = (el: HTMLElement): Srgb => {
  if (el.parentElement !== null) {
    return toRGB(getComputedStyle(el.parentElement).getPropertyValue('color'));
  }

  return DEFAULT_FG;
};

const getParentBg = (el: HTMLElement): Srgb => {
  while (el.parentElement !== null) {
    const color = toRGB(getComputedStyle(el.parentElement).getPropertyValue('background-color'));
    if (!isTransparent(color)) {
      return color;
    }
    el = el.parentElement;
  }

  return DEFAULT_BG;
};

const checkElement = (el: HTMLElement, {recurse}: { recurse?: boolean} = { recurse: false }): void => {
  if (!el) {
    return;
  }

  // If element has already been examined before, don't do any processing
  if ('_extensionTextContrast' in el.dataset) {
    return;
  }

  const fgClrDefined = isFgDefined(el);
  const bgClrDefined = isBgDefined(el);
  const bgImgDefined = isBgImgDefined(el);

  let fg = toRGB(getComputedStyle(el).getPropertyValue('color'));
  let bg = toRGB(getComputedStyle(el).getPropertyValue('background-color'));

  if (!fgClrDefined) {
    fg = toRGB(getDefaultComputedStyle(el).getPropertyValue('color'));
  }

  if (!bgClrDefined) {
    bg = toRGB(getDefaultComputedStyle(el).getPropertyValue('background-color'));
  }

  if (isTransparent(fg)) {
    fg = getParentFg(el);
  }
  if (isTransparent(bg)) {
    bg = getParentBg(el);
  }

  if (fgClrDefined && bgClrDefined) {
    // Both colors explicitly defined, nothing to do
    el.dataset._extensionTextContrast = '';

    stdEmbeds(el);

    return;
  } else if (!fgClrDefined && bgClrDefined) {
    // Note that if background image exists, it may be transparent, so we
    // can't afford to skip setting the color
    if (!isContrasty(fg, bg) || bgImgDefined) {
      el.dataset._extensionTextContrast = 'fg';
      stdEmbeds(el);

      return;
    }
  } else if (fgClrDefined && !bgClrDefined) {
    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'bg';
      stdEmbeds(el);

      return;
    }
  } else if (bgImgDefined) {
    if (!isContrasty(fg, bg) || isInputNode(el)) {
      // If bad contrast, set both colors in case background image is transparent
      el.dataset._extensionTextContrast = 'both';
    } else {
      // If existing bg color has good contrast, safe to only set foreground
      el.dataset._extensionTextContrast = 'fg';
    }
    stdEmbeds(el);

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
        checkElement(el.children[i] as HTMLElement, {recurse});
      }
    }
  }

};

const checkInputs = (root: Element = document.documentElement) => {
  // Check all input elements
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (el: HTMLElement) => isInputNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  );

  // Can't use for-of loop because a NodeIterator is not iteratable.
  // Thanks Javascript!
  let node = null;

  while ((node = nodeIterator.nextNode()) != null) {
    checkElement(node as HTMLElement);
  }
};

const checkAll = () => {
  // Recursively check the document
  checkElement(document.documentElement, {recurse: true});

  // Check input after
  checkInputs();
};

const checkParents = (el: HTMLElement) => {
  let parent = el.parentElement;

  if (topElementFixed) {
    // Still have to fix subdocs since style has been explicitly defined by us.
    stdEmbeds(el);
    return;
  }

  while (parent !== null) {
    if ('_extensionTextContrast' in parent.dataset) {
      // If any parents' were already handled,
      // new elements don't need recolor.

      if (parent === document.documentElement || parent === document.body) {
        // Style is already defined in top level document or body element, so all child elements (except for inputs)
        // will be ok. We cna avoid this check for all subsequent element additions or changes.
        topElementFixed = true;
      }

      // Still have to fix subdocs since style has been explicitly defined by us.
      stdEmbeds(el);

      return;
    }
    parent = parent.parentElement;
  }
  checkElement(el, {recurse: true});
};

const stdEmbeds = (e: HTMLElement) => {
  const nodeIterator = document.createNodeIterator(
    e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (el: Element) => isSubDocNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });

  // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
  // Javascript.
  let node: Node; // eslint-disable-line init-declarations

  while ((node = nodeIterator.nextNode()) != null) {
    (node as HTMLElement).dataset._extensionTextContrastFF = '';
    if ((node as HTMLIFrameElement).contentWindow !== null) {
      (node as HTMLIFrameElement).contentWindow.postMessage('_tcfdt_subdoc_std', '*');
    }
  }
};

browser.storage.local.get({'tcfdt-cr': 4.5}).then((items) => {
  setContrastRatio(items['tcfdt-cr']);
  checkAll();

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
        const changedNode = mutations[i].target;

        requestIdleCallback(() => { checkParents(changedNode as HTMLElement); });

        if (isInputNode(changedNode as HTMLElement)) {
          requestIdleCallback(() => { checkElement(changedNode as HTMLElement); });
        }
      } else if (mutations[i].type === 'childList') {
        const addLen = mutations[i].addedNodes.length;
        for (let j = 0; j < addLen; j += 1) {
          const newNode = mutations[i].addedNodes[j];
          if (!isInVisibleNode(newNode)) {
            requestIdleCallback(() => {
              checkParents(newNode as HTMLElement);
              checkInputs(newNode as HTMLElement);
            });
          }
        }
      }
    }
  });

  observer.observe(document, {
    attributes:        true,
    attributeFilter:   ['class', 'style'],
    childList:         true,
    subtree:           true,
  });

  dataObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-_extension-text-contrast'],
    subtree: true,
    attributeOldValue: true,
  });

  browser.runtime.onMessage.addListener((message: {}) => {
    const request = (message as {request: 'off'}).request;
    if (request === 'off') {
      dataObserver.disconnect();
      clearOverrides(document);
    }
  });

  window.addEventListener('message', (e) => {
    if (e.data === '_tcfdt_checkme') {
      // check all parents to see if extension has made any fixes
      // const src_win = ;

      try {
        let elem: HTMLElement | null = (e.source as Window).frameElement as HTMLElement;

        if ('_extensionTextContrastFF' in elem.dataset) {
          (e.source as Window).postMessage('_tcfdt_subdoc_std', '*');
        }
      } catch {
        // Likely failed due to cross-origin issues. Have no way of determining which frame element requested the check.
        // Only remaining option is to re-send directive for fixing to all frames that need it. Super-awkward and
        // flicker-y, but it works.
        const nodeIterator = document.createNodeIterator(
          document.documentElement,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (el: HTMLElement) => '_extensionTextContrastFF' in el.dataset ?
              NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
          },
        );

        let node = null;

        while ((node = nodeIterator.nextNode()) !== null) {
          (node as HTMLIFrameElement).contentWindow.postMessage('_tcfdt_subdoc_std', '*');
        }
      }

      e.stopPropagation();
    }
  }, true);

  if (window.self !== window.top && (!('tcfdtFrameFixed' in window) || !(window as any).tcfdtFrameFixed)) {
    window.parent.postMessage('_tcfdt_checkme', '*');
  }
});
