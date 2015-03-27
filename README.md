# darkContrast
Firefox addon that fixes low contrast text when using dark desktop theme

This addon is intended for Firefox users that have a light text/dark background system theme.
When visiting a website that only sets text color or background color of elements, those elements can end up with low contrast text, and are difficult to read.

This addon recurses through the elements of any page visited, and checks to see if the element color and background are
explicitely defined, taking the following actions:

- If all colors defined, stops recursing in that element
- If neither color is defined, then recurse for element's renderable children
- If only one color is defined, set the other color as needed to maintain contrast

Because input-like elements (``input``, ``textarea``, ``select``) do not inherit from parent elements, this addon also explicitely
scans for, and checks the colors of these elements.
