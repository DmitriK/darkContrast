var darkColor;
var lightColor;

self.port.on("colors", function(colors) {
    darkColor = colors[0];
    lightColor = colors[1];
    checkElementContrast(document.all[0]);
});

function checkElementContrast(element)
{
    var isFgUndefined = (getComputedStyle(element).color
                      == getDefaultComputedStyle(element).color);
    var isBgUndefined = (getComputedStyle(element).backgroundColor
                         == 'transparent')
                      && (getComputedStyle(element).backgroundImage == 'none');

    if (isFgUndefined && isBgUndefined) {
        // Both undefined, continue with children
        var children = element.children
        for (var i=0; i < children.length; i++) {
            // Don't look at non-renderable elements
            switch (element.children[i]) {
                case "HEAD":
                case "TITLE":
                case "META":
                case "SCRIPT":
                case "IMG":
                case "STYLE":
                    return;
                default:
                    checkElementContrast(element.children[i]);
            }
        }
    } else if (isFgUndefined) {
        element.style.color = darkColor;
    } else if (isBgUndefined) {
        element.style.backgroundColor = lightColor;
    }

    return;
}
