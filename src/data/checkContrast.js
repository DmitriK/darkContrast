/* Copyright (c) 2016 Dmitri Kourennyi
   See the file COPYING for copying permission.
*/
/* jshint moz: true, strict: global, browser: true, devel:true */
/* globals self, getDefaultComputedStyle*/
'use strict';

var darkColor;
var lightColor;
var allColors;

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

function is_fg_defined(element) {
    return getComputedStyle(element).color !=
        getDefaultComputedStyle(element).color;
}

function is_bg_defined(element) {
    return (getComputedStyle(element).backgroundColor !=
        getDefaultComputedStyle(element).backgroundColor);
}

function is_bg_img_defined(element) {
    return (getComputedStyle(element).backgroundImage != 'none');
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
        // always set fg if only bg color defined
        element.style.color = darkColor;
        return;
    }

    if (fg_color_defined && !bg_color_defined) {
        //since bg images might be transparent, set the bg color no
        //matter what
        element.style.backgroundColor = lightColor;
        return;
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
            break;
        default:
            checkElementContrast(element.children[i]);
        }
    }
    return;
}
