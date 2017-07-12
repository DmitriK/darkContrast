/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* exported contrast */
/* globals getDefaultComputedStyle:false color:false */
'use strict';

const contrast = {
  kInputElems: [
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON',
  ],
  kInvisibleElems: [
    'HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK',
    '#text',
    'FRAMESET',
  ],

  IFRAME_DELAY: 500,

  userInverted: false,

  checkDoc() {
    // Check from root recursively
    this.checkElement(document.documentElement, {recurse: true});

    // Other checks required when browser is in quirks mode
    if (document.compatMode === 'BackCompat') {
      // Tables don't inherit color
      const tables = document.getElementsByTagName('table');

      for (let i = 0; i < tables.length; i += 1) {
        if (getComputedStyle(tables[i]).color ===
          getDefaultComputedStyle(tables[i]).color) {
          // If color has not been set explicitly, then force inherit
          tables[i].style.color = 'inherit';
        }
      }
    }
  },

  checkElement(element, {
    recurse = false,
    delay = false,
    parentFg = null,
    parentBg = null,
  } = {}) {
    if (element == null) {
      return;
    }

    // If element has already been examined before, don't do any processing
    if (element.dataset._extensionTextContrast != null) {
      return;
    }

    const fg_color_defined = this.is_fg_defined(element) || (parentFg != null);
    const bg_color_defined = this.is_bg_defined(element) || (parentBg != null);
    const bg_img_defined = this.is_bg_img_defined(element);

    if (fg_color_defined && bg_color_defined) {
      // Both colors explicitly defined, nothing to do
      element.dataset._extensionTextContrast = '';
      this.fix_embeds(element, 'std');

      return;
    } else if (!fg_color_defined && bg_color_defined) {
      // Only set fg if original contrast is poor
      const fg = parentFg || color.to_rgb(getComputedStyle(element).color);
      const bg = color.to_rgb(getComputedStyle(element).backgroundColor);

      if (!color.is_transparent(bg)) {
        parentBg = bg;
      }

      if (color.is_transparent(bg) || !color.is_contrasty(fg, bg)) {
        element.dataset._extensionTextContrast = 'fg';
        this.fix_embeds(element, 'std');

        return;
      }
    } else if (fg_color_defined && !bg_color_defined) {
      // Only set bg if it will improve contrast
      const fg = color.to_rgb(getComputedStyle(element).color);
      const bg = parentBg ||
        color.to_rgb(getComputedStyle(element).backgroundColor);

      if (!color.is_transparent(fg)) {
        parentFg = fg;
      }

      if (!color.is_contrasty(fg, bg)) {
        element.dataset._extensionTextContrast = 'bg';
        this.fix_embeds(element, 'std');

        return;
      }
    } else if (bg_img_defined) {
      const default_bg =
        color.to_rgb(getDefaultComputedStyle(element).backgroundColor);

      if (!this.isInputNode(element) && color.is_transparent(default_bg)) {
        // If the background is supposed to be transparent, keep the
        // transparency and only fix foreground. Don't do this for input
        // elements as they have an inverted style from the get-go.
        element.dataset._extensionTextContrast = 'fg';
      } else {
        // No FG or BG color, but may have a transparent bg image. BG color is
        // not transparent, so need to set both colors.
        element.dataset._extensionTextContrast = 'both';
      }
      this.fix_embeds(element, 'std');

      return;
    }

    if (recurse === true) {
      const {children} = element;
      const len = children.length;

      for (let i = 0; i < len; i += 1) {
        // Don't look at non-renderable elements
        if (!this.isInVisibleNode(element.children[i])) {
          this.checkElement(element.children[i],
                            {recurse, delay, parentFg, parentBg});
        }
      }

      if (this.is_subdoc(element)) {
        if (delay) {
          setTimeout(() => {
            this.fix_embeds(element, 'fix');
          }, this.IFRAME_DELAY);
        } else {
          this.fix_embeds(element, 'fix');
        }
      }
    }
  },

  checkInputs(elem) {
    // Check all input elements under elem
    const nodeIterator = document.createNodeIterator(elem,
      NodeFilter.SHOW_ELEMENT, {acceptNode: this.isInputNode.bind(this)});

    // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
    // Javascript.
    let node; // eslint-disable-line init-declarations

    while ((node = nodeIterator.nextNode()) != null) {
      this.checkElement(node);
    }
  },

  clear_overrides(doc) {
    const elems = doc.querySelectorAll('[data-_extension-text-contrast]');

    for (const e of elems) {
      e.removeAttribute('data-_extension-text-contrast');
    }
  },

  fix_embeds(e, mode) {
    const nodeIterator = document.createNodeIterator(
      e, NodeFilter.SHOW_ELEMENT, {acceptNode: this.is_subdoc});

    // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
    // Javascript.
    let node; // eslint-disable-line init-declarations

    while ((node = nodeIterator.nextNode()) != null) {
      if (node.contentWindow != null) {
        if (mode === 'std') {
          node.contentWindow.postMessage('_tcfdt_subdoc_std', '*');
        } else if (mode === 'fix') {
          node.contentWindow.postMessage('_tcfdt_subdoc_fix', '*');
        } else if (mode === 'clr') {
          node.contentWindow.postMessage('_tcfdt_subdoc_clr', '*');
        }
      } else if (node.getSVGDocument != null && node.getSVGDocument() != null &&
        mode === 'std') {
        this.clear_overrides(node.getSVGDocument().documentElement);
        // Node is an <embed> SVG file, which will use the local stylesheet, so
        // set its dataset directly.
        node.getSVGDocument().documentElement.dataset._extensionTextContrast =
          'default';
      }
    }
  },

  get_subdoc(node) {
    if (node.contentDocument != null) {
      return node.contentDocument.documentElement;
    }

    if (node.getSVGDocument != null && node.getSVGDocument() != null) {
      return node.getSVGDocument().documentElement;
    }

    return null;
  },

  is_fg_defined(e) {
    return getComputedStyle(e).color !== getDefaultComputedStyle(e).color;
  },

  is_bg_defined(e) {
    return getComputedStyle(e).backgroundColor !==
      getDefaultComputedStyle(e).backgroundColor;
  },

  is_bg_img_defined(e) {
    return getComputedStyle(e).backgroundImage !== 'none';
  },

  isInputNode(node) {
    return this.kInputElems.indexOf(node.nodeName) > -1;
  },

  isInVisibleNode(node) {
    return this.kInvisibleElems.indexOf(node.nodeName) > -1;
  },

  is_subdoc(node) {
    if (node.contentWindow != null ||
      node.getSVGDocument != null && node.getSVGDocument() != null) {
      return true;
    }

    return false;
  },

  recolor_parent_check(elem) {
    if (this.userInverted === true) {
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
      if (defined) {
        // Color was set, adjust any child embeds
        setTimeout(() => {
          this.fix_embeds(elem, 'std');
        }, this.IFRAME_DELAY);
      } else {
        this.checkElement(elem, {recurse: true, delay: true});
      }
    }
  },

  updateUserInverted() {
    const defaultFg = color.to_rgb(getDefaultComputedStyle(
      document.documentElement).color);

    if (!color.is_contrasty(defaultFg, {r: 255, g: 255, b: 255, a: 1})) {
      // Contrast check against what sites will assume to be default
      // (black fg, white bg) failed, so user most likely has 'Use system
      // colors' on
      contrast.userInverted = true;
    }
  },
};
