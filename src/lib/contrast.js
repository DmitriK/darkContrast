/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* exported contrast */
/* globals getDefaultComputedStyle:false color:false */
'use strict';

const contrast = {
  kInputElems: [
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TOOLBARBUTTON',
  ],
  kInvisibleElems: [
    'HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK', '#text',
    'FRAMESET',
  ],

  IFRAME_DELAY: 500,

  userInverted: false,

  checkDoc() {
    // Check from root recursively
    this.checkElement(document.documentElement, true);

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
  },

  checkElement(element, recurse) {
    if (element == null) {
      return;
    }

    // If element has already been examined before, don't do any processing
    if (element.dataset._extensionTextContrast != null) {
      return;
    }

    const fg_color_defined = this.is_fg_defined(element);
    const bg_color_defined = this.is_bg_defined(element);
    const bg_img_defined = this.is_bg_img_defined(element);

    if (fg_color_defined && bg_color_defined) {
      // Both colors explicitely defined, nothing to do
      element.dataset._extensionTextContrast = '';
      this.fix_embeds(element);

      return;
    } else if (!fg_color_defined && bg_color_defined) {
      // Only set fg if original contrast is poor
      const fg_color = color.to_rgb(getComputedStyle(element).color);
      const bg_color = color.to_rgb(getComputedStyle(element).backgroundColor);

      if (color.is_transparent(bg_color) ||
          !color.is_contrasty(fg_color, bg_color)) {
        element.dataset._extensionTextContrast = 'fg';
        this.fix_embeds(element);

        return;
      }
    } else if (fg_color_defined && !bg_color_defined) {
      // Only set bg if it will improve contrast
      const fg_color = color.to_rgb(getComputedStyle(element).color);
      const bg_color = color.to_rgb(getComputedStyle(element).backgroundColor);

      if (!color.is_contrasty(fg_color, bg_color)) {
        element.dataset._extensionTextContrast = 'bg';
        this.fix_embeds(element);

        return;
      }
    } else if (bg_img_defined) {
      const default_bg =
        color.to_rgb(getDefaultComputedStyle(element).backgroundColor);

      if (color.is_transparent(default_bg)) {
        // If the background is supposed to be transparent, keep the transparency
        // and only fix foreground
        element.dataset._extensionTextContrast = 'fg';
      } else {
        // No FG or BG color, but may have a transparent bg image. BG color is
        // not transparent, so need to set both colors.
        element.dataset._extensionTextContrast = 'both';
      }
      this.fix_embeds(element);

      return;
    }

    if (recurse === true) {
      const {children} = element;
      const len = children.length;

      for (let i = 0; i < len; i += 1) {
        // Don't look at non-renderable elements
        if (!this.isInVisibleNode(element.children[i])) {
          this.checkElement(element.children[i], true);
        }
      }

      this.checkElement(this.get_subdoc(element), true);
    }
  },

  checkInputs(elem) {
    // Check all input elements under elem
    const nodeIterator = document.createNodeIterator(
        elem, NodeFilter.SHOW_ELEMENT, {acceptNode: this.isInputNode.bind(this)});

    // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
    // Javascript.
    let node; // eslint-disable-line init-declarations

    while ((node = nodeIterator.nextNode()) != null) {
      this.checkElement(node, false);
    }
  },

  clear_overrides(doc) {
    const elems = doc.querySelectorAll('[data-_extension-text-contrast]');

    for (const e of elems) {
      e.removeAttribute('data-_extension-text-contrast');
    }
  },

  fix_embeds(e) {
    const nodeIterator = document.createNodeIterator(
        e, NodeFilter.SHOW_ELEMENT, {acceptNode: this.is_subdoc});

    // Can't use for-in loop because a NodeIterator is not an iterator. Thanks
    // Javascript.
    let node; // eslint-disable-line init-declarations

    while ((node = nodeIterator.nextNode()) != null) {
      if (node.contentDocument != null) {
        // Node is an <iframe> or <object> and has its own window, so message the
        // content script there that colors should be standard.
        node.contentWindow.postMessage('_tcfdt_subdoc', '*');
      }
      if (node.getSVGDocument != null && node.getSVGDocument() != null) {
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
    if (node.contentDocument != null ||
      (node.getSVGDocument != null && node.getSVGDocument() != null)) {
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
      if (!defined) {
        this.checkElement(elem, true);
      } else {
        setTimeout(() => {
          this.fix_embeds(elem);
        }, this.IFRAME_DELAY);
      }
    }
  },
};
