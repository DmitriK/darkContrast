# darkContrast
Firefox addon that fixes low contrast text when using dark desktop theme

This addon is intended for Firefox users that have a light text/dark background system theme.

The primary purpose of this addon is to fix input elements, which are drawn with
a native dark style, but may have an explicit foreground or background color
which assumes a light style, resulting in low contrast text. This addon checks
if only one of the colors has been defined (foreground color, or background
color/image), and defines the unset property as needed. Elements with both
colors defined or both colors undefined remain unchanged.

An experimental option can also attempt to adjust all page colors if the "use
system colors" Firefox option is set. The option makes this addon recurse
through the elements of any page visited and taking the following actions:

- If all colors defined, stops recursing in that element
- If neither color is defined, then recurse through element's render-able
  children
- If only one color is defined, set the other color as needed to maintain
  contrast

This option does not always seem to work correctly, and can misbehave on
websites rendering in quirks mode, and thus should be considered experimental.
