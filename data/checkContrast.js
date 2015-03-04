var darkColor;
var lightColor;

self.port.on("colors", function(dark, light) {
    darkColor = dark;
    lightColor = light;
    checkElementContrast(document.getElementsByTagName("html")[0]);
});

function checkElementContrast(element)
{
    // Don't look at non-renderable elements
    switch (element.tagName) {
        case "HEAD":
        case "SCRIPT":
            return;
    }

    var isFgDefined = (getComputedStyle(element).color
                      != getDefaultComputedStyle(element).color);
    var isBgDefined = getComputedStyle(element).backgroundColor
                      != 'transparent';

    if (!isFgDefined && !isBgDefined) {
        // Both undefined, continue with children
        var children = element.children
        for (var i=0; i < children.length; i++) {
            console.log("Recursing into: " + element.children[i]);
            checkElementContrast(element.children[i]);
        }
    } else if (!isFgDefined) {
        console.log("Setting text color of " + element);
        element.style.color = "black";
    } else if (!isBgDefined) {
        console.log("Setting background color of " + element);
        element.style.backgroundColor = "white";
    } else {
        console.log("Element " + element + " ok, stopping.");
    }

    return;
}
