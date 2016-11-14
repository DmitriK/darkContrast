/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* jshint moz: true, strict: global, browser: true, devel:true */
/* globals self, getDefaultComputedStyle*/
'use strict';

const kInputElems = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TOOLBARBUTTON'];
const kInvisibleElems = ['HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE',
                         'BR', 'LINK',];

var bgPort = browser.runtime.connect({name: 'port-from-cs'});

var userInverted;

var defaultFg = getDefaultComputedStyle(document.documentElement).color;

if (is_light(colorstyle_to_rgb(defaultFg))) {
  // Default foreground color is light, so user most likely has 'Use system
  // colors' on
  userInverted = true;
} else {
  userInverted = false;
}

bgPort.onMessage.addListener(function(m) {
  if (m.request === 'toggle') {
    let elems = document.querySelectorAll('[data-_extension-text-contrast]');
    if (elems.length == 0) {
      checkInputs(document.documentElement);
      if (userInverted === true) {
        checkDoc();
      }
    } else {
      for (let e of elems) {
        e.removeAttribute('data-_extension-text-contrast');
      }
    }
  }
});

checkInputs(document.documentElement);

if (userInverted === true) {
  checkDoc();
}

var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes') {
          // This mutation represents a change to class or style of element
          // so this element also needs re-checking
          var changedNode = mutation.target;

          if (isInputNode(changedNode)) {
            checkElementContrast(changedNode, false)
          }
          recolor_parent_check(changedNode);
        } else {
          for (var newNode of mutation.addedNodes) {
            // Check visibility of new nodes before furhter processing
            if (!isInVisibleNode(newNode)) {
              checkInputs(newNode);
              recolor_parent_check(newNode);
            }
          }
        }
      });
  });
var config = {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  };
observer.observe(document, config);

function checkDoc() {
  // Check from root recursively
  checkElementContrast(document.documentElement, true);

  // Other checks required when browser is in quirks mode
  if (document.compatMode === 'BackCompat') {
    // Tables don't inherit color
    var tables = document.getElementsByTagName('table');
    for (var i = 0; i < tables.length; i++) {
      if (getComputedStyle(tables[i]).color ===
          getDefaultComputedStyle(tables[i]).color) {
        // If color has not been set explicitely, then force inherit
        tables[i].style.color = 'inherit';
      }
    }
  }
}

function checkInputs(elem) {
  // Check all input elements under elem
  var nodeIterator = document.createNodeIterator(
      elem, NodeFilter.SHOW_ELEMENT, {
          acceptNode: isInputNode,
        });
  var node;
  while ((node = nodeIterator.nextNode())) {
    // Don't recurse when checkign input elements, as they don't really have a
    // hierarchy
    checkElementContrast(node, false);
  }
}

function isInputNode(node) {
  return kInputElems.indexOf(node.nodeName) > -1;
}

function isInVisibleNode(node) {
  return kInvisibleElems.indexOf(node.nodeName) > -1;
}


function checkElementContrast(element, recurse) {
  // If element has already been examined before, don't do any processing
  if (element.dataset._extensionTextContrast !== undefined) {
    return;
  }

  var fg_color_defined = is_fg_defined(element);
  var bg_color_defined = is_bg_defined(element);
  var bg_img_defined = is_bg_img_defined(element);

  if (fg_color_defined && bg_color_defined) {
    //Both colors explicitely defined, nothing to do
    element.dataset._extensionTextContrast = '';
    return;
  }

  if (!fg_color_defined && bg_color_defined) {
    // Only set fg if original contrast is poor
    var fg_color = colorstyle_to_rgb(getComputedStyle(element).color);
    var bg_color = colorstyle_to_rgb(getComputedStyle(element).backgroundColor);
    if (is_transparent(bg_color) || !isContrastyWCAG(fg_color, bg_color)) {
      element.dataset._extensionTextContrast = 'fg';
      return;
    }
  }

  if (fg_color_defined && !bg_color_defined) {
    // Only set bg if it will improve contrast
    var fg_color = colorstyle_to_rgb(getComputedStyle(element).color);
    var bg_color = colorstyle_to_rgb(getComputedStyle(element).backgroundColor);
    if (!isContrastyWCAG(fg_color, bg_color)) {
      element.dataset._extensionTextContrast = 'bg';
      return;
    }
  }

  if (bg_img_defined) {
    //No FG or BG color, but possibly transparent image, so need
    //to set both
    element.dataset._extensionTextContrast = 'both';
    return;
  }

  if (recurse === true) {
    var children = element.children;
    for (var i = 0; i < children.length; i++) {
      // Don't look at non-renderable elements
      if (isInVisibleNode(element.children[i])) {
        continue;
      }
      checkElementContrast(element.children[i], true);
    }
  }
}

function is_fg_defined(e) {
  return getComputedStyle(e).color !== getDefaultComputedStyle(e).color;
}

function is_bg_defined(e) {
  return (getComputedStyle(e).backgroundColor !==
      getDefaultComputedStyle(e).backgroundColor);
}

function is_bg_img_defined(e) {
  return (getComputedStyle(e).backgroundImage !== 'none');
}

function colorstyle_to_rgb(s) {
  var color = {};
  if (s === 'transparent') {
    color.r = 0;
    color.g = 0;
    color.b = 0;
    color.a = 0;
    return color;
  }
  var parts = s.split(',', 3);
  color.r = parseInt(parts[0].substr(parts[0].indexOf('(', 3) + 1));
  color.g = parseInt(parts[1].trim());
  color.b = parseInt(parts[2].trim());
  color.a = 1;
  return color;
}

function getIntensityWCAG(srgb) {
  let rgbNormalized = [srgb.r / 255.0, srgb.g / 255.0, srgb.b / 255.0]
  let rgbLin = rgbNormalized.map(function(v) {
    if (v <= 0.03928) {
      return v / 12.92
    } else {
      return Math.pow((v + 0.055) / 1.055, 2.4)
    }
  });

  return 0.2126 * rgbLin[0] + 0.7152 * rgbLin[1] + 0.0722 * rgbLin[2];
}

function isContrastyWCAG(fore, back) {
  let lumF = getIntensityWCAG(fore);
  let lumB = getIntensityWCAG(back);

  let L1 = Math.max(lumF, lumB);
  let L2 = Math.min(lumF, lumB);

  return (L1 + 0.05) / (L2 + 0.05) > 7;
}

function is_dark(rgb) {
  return getIntensityWCAG(rgb) < 0.5;
}

function is_light(rgb) {
  return getIntensityWCAG(rgb) > 0.5;
}

function is_transparent(rgb) {
  return rgb.a === 0;
}

function recolor_parent_check(elem) {
  if (userInverted === true) {
    var parent = elem.parentElement;
    var defined = false;
    while (parent !== null) {
      if (is_fg_defined(parent) ||
          is_bg_defined(parent) ||
          is_bg_img_defined(parent)) {
        // If any parents' color property is defined,
        // new elements don't need recolor.
        defined = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (!defined) {
      checkElementContrast(elem, true);
    }
  }
}
