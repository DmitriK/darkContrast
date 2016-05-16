/* Copyright (c) 2016 Dmitri Kourennyi
   See the file COPYING for copying permission.
*/

var darkColor;
var lightColor;
var allColors;

self.port.on("colors", function (colors) {
    'use strict';

    darkColor = colors[0];
    lightColor = colors[1];
    allColors = colors[2];

    checkInputs();
    if (allColors === true) {
        checkDoc();
    }

    var observer = new MutationObserver(function (mutations) {
        schedule_check();
    });
    var config = {
        childList: true,
        subtree: true,
    };
    observer.observe(document, config);
});

var tmr;
var queued = false;

function schedule_check() {
    if (queued) {
        window.clearTimeout(tmr);
    }
    tmr = window.setTimeout(function () {
        checkInputs();
        if (allColors === true) {
            checkDoc();
        }
        queued = true;
    }, 100);
    queued = true;

}

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
    'use strict';
    ["input", "textarea", "select", "button", "toolbarbutton"].forEach(
        function (val) {
            var elements = document.getElementsByTagName(val),
                i;
            for (i = 0; i < elements.length; i += 1) {
                checkElementContrast(elements[i]);
            }
        });
}

function checkElementContrast(element) {
    'use strict';

    var isBgUndefined, hasBgImg;

    try {
        var isFgUndefined = (getComputedStyle(element).color ==
            getDefaultComputedStyle(element).color);
        isBgUndefined = (getComputedStyle(element).backgroundColor ==
            getDefaultComputedStyle(element).backgroundColor);

        hasBgImg = (getComputedStyle(element).backgroundImage != 'none');
    } catch (e) {
        console.log("Got exception " + e.message + " when parsing element " +
            element.tagName + "." + element.className + "#" + element.id);
        return;
    }

    isBgUndefined = isBgUndefined && !hasBgImg;

    var fg_color_defined = getComputedStyle(element).color !=
        getDefaultComputedStyle(element).color;
    var bg_color_defined = getComputedStyle(element).backgroundColor !=
        getDefaultComputedStyle(element).backgroundColor;
    var bg_img_defined = getComputedStyle(element).backgroundImage != 'none';

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
