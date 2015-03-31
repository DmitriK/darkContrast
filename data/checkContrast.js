var darkColor;
var lightColor;

self.port.on("colors", function(colors) {
    darkColor = colors[0];
    lightColor = colors[1];
    //console.log("Contrast: got colors, checking elements");

    // Now replace document colors
    checkElementContrast(document.all[0]);

    // Seperately check input and textarea nodes
    var inputs = document.getElementsByTagName("input");
    for (var i=0; i < inputs.length; i++) {
        checkElementContrast(inputs[i]);
    }

    var texts = document.getElementsByTagName("textarea");
    for (var i=0; i < texts.length; i++) {
        checkElementContrast(texts[i]);
    }

    var selects = document.getElementsByTagName("select");
    for (var i=0; i < selects.length; i++) {
        checkElementContrast(selects[i]);
    }

    // Other checks required when browser is in quirks mode
    if (document.compatMode == "BackCompat") {
        // tables don't inherit color
        var tables = document.getElementsByTagName("table");
        for (var i=0; i < tables.length; i++) {
            checkElementContrast(tables[i]);
        }
    }

});

function checkElementContrast(element)
{
    var isFgUndefined = (getComputedStyle(element).color == getDefaultComputedStyle(element).color);
    var isBgUndefined = (getComputedStyle(element).backgroundColor == getDefaultComputedStyle(element).backgroundColor)
                      && (getComputedStyle(element).backgroundImage == 'none'); //Background image is not set

    //console.log("Contrast: checking \"" + element.tagName + '#' + element.id + '"');
    //console.log("color: " + getComputedStyle(element).color + "default: " + getDefaultComputedStyle(element).color
                      //+ "background: " + getComputedStyle(element).backgroundColor + "default: " + getDefaultComputedStyle(element).backgroundColor
                      //+ "image:" + getComputedStyle(element).backgroundImage)

    if (isFgUndefined && isBgUndefined) {
        // Both undefined, continue with children
        var children = element.children
        for (var i=0; i < children.length; i++) {
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
                    //console.log("Contrast: recursing");
                    checkElementContrast(element.children[i]);
            }
        }
    } else if (isFgUndefined) {
        //console.log("Contrast: setting color");
        element.style.color = darkColor;
    } else if (isBgUndefined) {
        //console.log("Contrast: setting background");
        element.style.backgroundColor = lightColor;
    }

    return;
}
