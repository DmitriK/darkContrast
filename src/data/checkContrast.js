/* Copyright (c) 2016 Dmitri Kourennyi
   See the file COPYING for copying permission.
*/
/* jshint moz: true, strict: global, browser: true, devel:true */
/* globals self, getDefaultComputedStyle*/
'use strict';

var darkColor;
var lightColor;
var allColors;

var defaultFg;

const kInputElems = ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "TOOLBARBUTTON"];

function isInputNode(node) {
    return kInputElems.indexOf(node.nodeName) > -1;
}

self.port.on("colors", function (colors) {
    darkColor = colors[0];
    lightColor = colors[1];
    allColors = colors[2];

    checkInputs();
    if (allColors === true) {
        checkDoc();
    }

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            for (var newNode of mutation.addedNodes) {
                // Get all input-like elements
                var nodeIterator = document.createNodeIterator(
                    newNode, NodeFilter.SHOW_ELEMENT, {
                        acceptNode: isInputNode
                    });
                var node;
                while ((node = nodeIterator.nextNode())) {
                    checkElementContrast(node);
                }

                if (allColors === true) {
                    var parent = newNode.parentElement;
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
                        checkElementContrast(newNode);
                    }
                }
            }
        });
    });
    var config = {
        childList: true,
        subtree: true,
    };
    observer.observe(document, config);
});

function checkDoc() {
    checkElementContrast(document.all[0]);

    // Other checks required when browser is in quirks mode
    if (document.compatMode == "BackCompat") {
        // tables don't inherit color
        var tables = document.getElementsByTagName("table");
        for (var i = 0; i < tables.length; i++) {
            if (getComputedStyle(tables[i]).color ==
                getDefaultComputedStyle(tables[i]).color) {
                //if color has not been set explicitely, then force inherit
                tables[i].style.color = "inherit";
            }
        }
    }
}

function checkInputs() {
    kInputElems.forEach(
        function (val) {
            var elements = document.getElementsByTagName(val),
                i;
            for (i = 0; i < elements.length; i += 1) {
                checkElementContrast(elements[i]);
            }
        });
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

function get_intensity(rgb) {
    // Use Rec. 709 chromaticity luma, matching sRGB
    return Math.round(0.21 * rgb.r + 0.72 * rgb.g + 0.07 * rgb.b);
}

function is_dark(rgb) {
    return get_intensity(rgb) < 94;
}

function is_light(rgb) {
    return get_intensity(rgb) > 145;
}

function is_transparent(rgb) {
    return rgb.a === 0;
}

function checkElementContrast(element) {
    var fg_color_defined = is_fg_defined(element);
    var bg_color_defined = is_bg_defined(element);
    var bg_img_defined = is_bg_img_defined(element);

    if (fg_color_defined && bg_color_defined) {
        //Both colors explicitely defined, nothing to do
        return;
    }

    if (!fg_color_defined && bg_color_defined) {
        // only set fg if it will improve contrast
        var bg_color = colorstyle_to_rgb(getComputedStyle(element).backgroundColor);
        if (is_light(bg_color) || is_transparent(bg_color)) {
            element.style.color = darkColor;
            return;
        }
    }

    if (fg_color_defined && !bg_color_defined) {
        // only set bg if it will improve contrast
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

    //Nothing defined, recurse through children
    var children = element.children;
    for (var i = 0; i < children.length; i++) {
        // Don't look at non-renderable elements
        switch (element.children[i].nodeName) {
        case "HEAD":
        case "TITLE":
        case "META":
        case "SCRIPT":
        case "IMG":
        case "STYLE":
        case "BR":
            break;
        default:
            checkElementContrast(element.children[i]);
        }
    }
    return;
}
