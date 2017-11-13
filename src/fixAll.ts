/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* globals getDefaultComputedStyle:false */

import { isContrasty, isTransparent, setContrastRatio, Srgb, toRGB } from './lib/color';

declare function getDefaultComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;

const INVISIBLE_NODES = [
  'HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK', '#text',
  'FRAMESET',
];
const INPUT_NODE_NAMES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

const SUBDOC_NODES = ['IFRAME', 'SVG', 'OBJECT', 'EMBED', 'FRAME'];

const isFgDefined = (e: Element) => getComputedStyle(e).color !== getDefaultComputedStyle(e).color;

const isBgDefined = (e: Element) => getComputedStyle(e).backgroundColor !==
  getDefaultComputedStyle(e).backgroundColor;

const isBgImgDefined = (e: Element) => getComputedStyle(e).backgroundImage !== 'none';

const isInVisibleNode = (node: Node) => INVISIBLE_NODES.indexOf(node.nodeName) > -1;
const isInputNode = (node: Node) => INPUT_NODE_NAMES.indexOf(node.nodeName) > -1;
const isSubDocNode = (node: Node) => SUBDOC_NODES.indexOf(node.nodeName) > -1;

const checkElement = (el: HTMLElement,
                      {recurse, parentFg, parentBg}: {recurse?: boolean, parentFg?: Srgb, parentBg?: Srgb} =
                        {recurse: false, parentFg: undefined, parentBg: undefined}): void => {
  if (!el) {
    return;
  }

  // If element has already been examined before, don't do any processing
  if (el.dataset._extensionTextContrast) {
    return;
  }

  const fgClrDefined = isFgDefined(el);
  const bgClrDefined = isBgDefined(el);
  const bgImgDefined = isBgImgDefined(el);
  const fgParentDefined = parentFg !== undefined;
  const bgParentDefined = parentBg !== undefined;

  if ((fgClrDefined || fgParentDefined) &&
      (bgClrDefined || bgParentDefined)) {
    // Both colors explicitly defined, nothing to do
    el.dataset._extensionTextContrast = '';

    stdEmbeds(el);

    return;
  } else if (!(fgClrDefined || fgParentDefined) &&
             (bgClrDefined || bgParentDefined)) {
    const fg = toRGB(getComputedStyle(el).getPropertyValue('color'));
    const bg = bgClrDefined
      ? toRGB(getComputedStyle(el).getPropertyValue('backgroundColor'))
      : parentBg;

    // Note that if background image exists, it may not be transparent, so we
    // can't afford to skip setting the color
    if (!isContrasty(fg, bg) || bgImgDefined) {
      el.dataset._extensionTextContrast = 'fg';
      stdEmbeds(el);

      return;
    }

    // Otherwise, propagate the background color if it isn't transparent
    if (bgClrDefined && !isTransparent(bg)) {
      parentBg = bg;
    }
  } else if ((fgClrDefined || fgParentDefined) &&
             !(bgClrDefined || bgParentDefined)) {
    const fg = fgClrDefined
      ? toRGB(getComputedStyle(el).getPropertyValue('color'))
      : parentFg;
    const bg = toRGB(getComputedStyle(el).getPropertyValue('backgroundColor'));

    if (!isContrasty(fg, bg)) {
      el.dataset._extensionTextContrast = 'bg';
      stdEmbeds(el);

      return;
    }

    if (fgClrDefined && !isTransparent(fg)) {
      parentFg = fg;
    }
  } else if (bgImgDefined) {
    // No FG or BG color, but may have a transparent bg image, set both colors
    el.dataset._extensionTextContrast = 'both';
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
        checkElement(el.children[i] as HTMLElement, {recurse, parentFg, parentBg});
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
      acceptNode: (el: Element) => isInputNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
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

const stdEmbeds = (e: HTMLElement) => {
  const nodeIterator = document.createNodeIterator(
    e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (el: Element) => isSubDocNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });

  // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
  // Javascript.
  let node; // eslint-disable-line init-declarations

  while ((node = nodeIterator.nextNode()) != null) {
    (node as HTMLIFrameElement).contentWindow.postMessage('_tcfdt_subdoc_std', '*');
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

  setContrastRatio(items['tcfdt-cr']);
  checkAll();

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
        const changedNode = mutation.target;

        checkParents(changedNode as HTMLElement);

        if (isInputNode(changedNode)) {
          checkElement(changedNode as HTMLElement);
        }
      } else {
        for (const newNode of mutation.addedNodes) {
          if (!isInVisibleNode(newNode)) {
            checkParents(newNode as HTMLElement);
            checkInputs(newNode as HTMLElement);
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