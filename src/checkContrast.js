/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* jshint moz: true, strict: global, browser: true, devel:true */
/* globals self, getDefaultComputedStyle*/
'use strict';

var darkColor = 'black';
var lightColor = 'white';
var allColors;
var userInverted;

var defaultFg = getDefaultComputedStyle(document.documentElement).color;

if (is_light(colorstyle_to_rgb(defaultFg))) {
  // Default foreground color is light, so user most likely has 'Use system
  // colors' on
  userInverted = true;
} else {
  userInverted = false;
}

const kInputElems = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TOOLBARBUTTON'];
const kInvisibleElems = ['HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE',
                         'BR', 'LINK'];

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
  var fg_color_defined = is_fg_defined(element);
  var bg_color_defined = is_bg_defined(element);
  var bg_img_defined = is_bg_img_defined(element);

  if (fg_color_defined && bg_color_defined) {
    //Both colors explicitely defined, nothing to do
    return;
  }

  if (!fg_color_defined && bg_color_defined) {
    // Only set fg if it will improve contrast
    var bg_color = colorstyle_to_rgb(getComputedStyle(element).backgroundColor);
    if (is_light(bg_color) || is_transparent(bg_color)) {
      element.style.color = darkColor;
      return;
    }
  }

  if (fg_color_defined && !bg_color_defined) {
    // Only set bg if it will improve contrast
    var fg_color = colorstyle_to_rgb(getComputedStyle(element).color);
    if (is_dark(fg_color)) {
      element.style.backgroundColor = lightColor;
      return;
    }
  }

  if (bg_img_defined) {
    //No FG or BG color, but possibly transparent image, so need
    //to set both
    element.style.color = darkColor;
    element.style.backgroundColor = lightColor;
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

/// @todo Use WCAG 2.0 color specifications for determining contrast. Entails:
///       - Use linear RGB instead of sRGB for determining luminosity
///       - Luminosity scaling factors are: [0.2126, 0.7152, 0.0722]
///       - Luminosity ratio is defined as (L1 + 0.05) / (L2 + 0.05) where L1 is
///         the light color and L2 is the dark
///       - Ratio should be ≥7:1 for small text, ≥4.5:1 for large
function getIntensity(rgb) {
  // Use Rec. 709 chromaticity luma, matching sRGB
  return Math.round(0.21 * rgb.r + 0.72 * rgb.g + 0.07 * rgb.b);
}

function is_dark(rgb) {
  return getIntensity(rgb) < 94;
}

function is_light(rgb) {
  return getIntensity(rgb) > 145;
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
