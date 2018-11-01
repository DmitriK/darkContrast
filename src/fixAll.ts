/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */

import { getParentBg, getParentFg, isContrasty, isTransparent, setContrastRatio, toRGB } from './lib/color';
import { INPUT_NODES, INPUT_PERMS, isInputNode, isInVisibleNode, isSubDocNode } from './lib/checks';
import { clearOverrides } from './lib/contrast';

declare function requestIdleCallback(callback: (idleDeadline: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => any, options?: { timeout: number }): number;

let DEFAULTS: { [key: string]: { fg: string, bg: string } } = {};

let topElementFixed = false;

const getDefaultColors = () => {
  let probe_frame = document.createElementNS('http://www.w3.org/1999/xhtml', 'iframe') as HTMLIFrameElement;
  // probe_frame.src = 'about:blank';
  probe_frame.style.width = '0';
  probe_frame.style.height = '0';
  document.body.appendChild(probe_frame);
  let frame_doc = probe_frame.contentWindow!.document;
  // Get default style for general elements
  let par = frame_doc.createElement('p');
  frame_doc.body.appendChild(par);
  DEFAULTS['html'] = { fg: getComputedStyle(par).getPropertyValue('color'), bg: getComputedStyle(par).getPropertyValue('background-color') };
  // Get default browser style, which should be the final non-transparent color
  frame_doc.body.style.color = '-moz-default-color';
  frame_doc.body.style.backgroundColor = '-moz-default-background-color';
  DEFAULTS['browser'] = { fg: getComputedStyle(frame_doc.body).getPropertyValue('color'), bg: getComputedStyle(frame_doc.body).getPropertyValue('background-color') };

  // Get colors for input nodes
  for (const ip of INPUT_PERMS) {
    let probe = frame_doc.createElement(ip.nodeName);
    if (ip.props) {
      for (const key in ip.props) {
        (probe as any)[key] = ip.props[key];
      }
    }

    frame_doc.body.appendChild(probe);

    DEFAULTS[ip.cssSelector] = { fg: getComputedStyle(probe).getPropertyValue('color'), bg: getComputedStyle(probe).getPropertyValue('background-color') }
  }
  document.body.removeChild(probe_frame);
}

const getDefaultsForElement = (el: HTMLElement) => {
  for (const { cssSelector } of INPUT_PERMS) {
    if (el.matches(cssSelector)) {
      return DEFAULTS[cssSelector];
    }
  }
  return DEFAULTS['html'];
}

const checkElement = (el: HTMLElement | null, { recurse }: { recurse?: boolean } = { recurse: false }): void => {
  if (!el) {
    return;
  }

  // If element has already been examined before, don't do any processing
  if ('_extensionTextContrast' in el.dataset) {
    return;
  }

  // Grab current and default styles
  const compStyle = getComputedStyle(el);
  let fg = compStyle.getPropertyValue('color');
  let bg = compStyle.getPropertyValue('background-color');
  let fg_default;
  let bg_default;
  if (INPUT_NODES.indexOf(el.nodeName) !== -1) {
    const def = getDefaultsForElement(el);
    fg_default = def.fg;
    bg_default = def.bg;
  } else {
    fg_default = DEFAULTS['html'].fg;
    bg_default = DEFAULTS['html'].bg;
  }

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

    stdEmbeds(el);

    return;
  } else if (!fgClrDefined && bgClrDefined) {
    // Note that if background image exists, it may be transparent, so we
    // can't afford to skip setting the color
    if (!isContrasty(fg_rgba, bg_rgba) || bgImgDefined) {
      el.dataset._extensionTextContrast = 'fg';
      stdEmbeds(el);

      return;
    }
  } else if (fgClrDefined && !bgClrDefined) {
    if (!isContrasty(fg_rgba, bg_rgba)) {
      el.dataset._extensionTextContrast = 'bg';
      stdEmbeds(el);

      return;
    }
  } else if (bgImgDefined) {
    if (!isContrasty(fg_rgba, bg_rgba) || isInputNode(el)) {
      // If bad contrast, set both colors in case background image is transparent
      el.dataset._extensionTextContrast = 'both';
      stdEmbeds(el);

      return;
    }
  }

  // If here, then either no colors were defined, or those that were still have
  // contrast. Need to continue checking child elements to ensure contrast is OK

  if (recurse === true) {
    const { children } = el;
    const len = children.length;

    for (let i = 0; i < len; i += 1) {
      // Don't look at non-renderable elements
      if (!isInVisibleNode(el.children[i])) {
        checkElement(el.children[i] as HTMLElement, { recurse });
      }
    }
  }

};

const checkInputs = (root = document.documentElement) => {
  if (!root) {
    return;
  }
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
  checkElement(document.documentElement, { recurse: true });

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
  checkElement(el, { recurse: true });
  checkInputs(el);
};

const stdEmbeds = (e: HTMLElement) => {
  const nodeIterator = document.createNodeIterator(
    e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (el: Element) => isSubDocNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });

  // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
  // Javascript.
  let node: Node | null = null; // eslint-disable-line init-declarations

  while ((node = nodeIterator.nextNode()) != null) {
    (node as HTMLElement).dataset._extensionTextContrastFF = '';
    if ((node as HTMLIFrameElement).contentWindow !== null) {
      (node as HTMLIFrameElement).contentWindow!.postMessage('_tcfdt_subdoc_std', '*');
    }
  }
};

browser.storage.local.get({ 'tcfdt-cr': 4.5 }).then((items) => {
  getDefaultColors();
  setContrastRatio(items['tcfdt-cr']);
  checkAll();

  const dataObserver = new MutationObserver((mutations, observer) => {
    mutations.forEach((mutation) => {
      if (mutation.oldValue !== null) {
        // Something in the author JS has erased the previous attribute, so
        // restore it.
        // Disable ourselves, otherwise this enters infinite loop
        observer.disconnect();
        const element = mutation.target as HTMLElement;
        element.dataset._extensionTextContrast = mutation.oldValue;
        // Restore observer now that we are done
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['data-_extension-text-contrast'],
          subtree: true,
          attributeOldValue: true,
        });
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
          requestIdleCallback(() => {
            checkElement(changedNode as HTMLElement);
          });
        }
      } else if (mutations[i].type === 'childList') {
        const addLen = mutations[i].addedNodes.length;
        for (let j = 0; j < addLen; j += 1) {
          const newNode = mutations[i].addedNodes[j];
          if (!isInVisibleNode(newNode)) {
            requestIdleCallback(() => {
              checkParents(newNode as HTMLElement);
            });
          }
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
        if (!document.documentElement) {
          e.stopPropagation();
          return;
        }
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
          (node as HTMLIFrameElement).contentWindow!.postMessage('_tcfdt_subdoc_std', '*');
        }
      }

      e.stopPropagation();
    }
  }, true);

  if (window.self !== window.top && (!('tcfdtFrameFixed' in window) || !(window as any).tcfdtFrameFixed)) {
    window.parent.postMessage('_tcfdt_checkme', '*');
  }
});
