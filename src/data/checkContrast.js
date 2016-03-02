/* Copyright (c) 2016 Dmitri Kourennyi
   See the file COPYING for copying permission.
*/

var darkColor;
var lightColor;

self.port.on("colors", function (colors) {
    darkColor = colors[0];
    lightColor = colors[1];
    allColors = colors[2];

    if (allColors == true) {
        // Now replace document colors
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

    // Seperately check input-like elements
    ["input", "textarea", "select", "button", "toolbarbutton"].forEach(
        function (val) {
            var elements = document.getElementsByTagName(val),
                i;
            for (i = 0; i < elements.length; i += 1) {
                checkElementContrast(elements[i]);
            }
        });
});

function checkElementContrast(element) {
    try {
        var isFgUndefined = (getComputedStyle(element).color ==
            getDefaultComputedStyle(element).color);
        var isBgUndefined = (getComputedStyle(element).backgroundColor ==
            getDefaultComputedStyle(element).backgroundColor)

        var hasBgImg = (getComputedStyle(element).backgroundImage != 'none');
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
    var children = element.children
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
