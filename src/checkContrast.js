/* Copyright (c) 2016 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* jshint moz: true, strict: global, browser: true, devel:true */
/* globals self, getDefaultComputedStyle*/
'use strict';

var darkColor = "black";
var lightColor = "white";
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

console.log(darkColor);
console.log(lightColor);

const kInputElems = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TOOLBARBUTTON'];

checkInputs(document.documentElement);

var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.type == 'attributes') {
          // This mutation represents a change to class or style of element
          // so this element also needs re-checking
          var changedNode = mutation.target;
          checkInputs(changedNode);
          // Recolor_parent_check(changedNode);
        } else {
          for (var newNode of mutation.addedNodes) {
            checkInputs(newNode);
            // Recolor_parent_check(newNode);
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

function checkInputs(elem) {
  // Check all input elements under elem
  var nodeIterator = document.createNodeIterator(
      elem, NodeFilter.SHOW_ELEMENT, {
          acceptNode: isInputNode,
        });
  var node;
  while ((node = nodeIterator.nextNode())) {
    checkElementContrast(node);
  }
}

function isInputNode(node) {
  return kInputElems.indexOf(node.nodeName) > -1;
}

// Non-recursive version
function checkElementContrast(element) {
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
}

function is_fg_defined(e) {
  return getComputedStyle(e).color != getDefaultComputedStyle(e).color;
}

function is_bg_defined(e) {
  return (getComputedStyle(e).backgroundColor !=
      getDefaultComputedStyle(e).backgroundColor);
}

function is_bg_img_defined(e) {
  return (getComputedStyle(e).backgroundImage != 'none');
}

function colorstyle_to_rgb(s) {
  var color = {};
  if (s == 'transparent') {
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
