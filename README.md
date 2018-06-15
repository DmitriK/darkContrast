# Text Contrast for Dark Themes

Firefox extension that fixes low contrast text when using a dark desktop theme.

For users who don't want *any* native theming in web content, Firefox has a
built-in solution. In `about:config`, verify that
`widget.content.allow-gtk-dark-theme` is `false`. If you use a theme that does
not have a light variant (e.g, Arc Dark; the light version, Arc, is a separate
theme), then create a new string entry in `about:config` called
`widget.content.gtk-theme-override` and set it to a light theme, e.g. `Arc` or
`Adwaita:light`.

Otherwise, for users who wish to retain dark theming of un-styled input elements
or entire pages, this extension tries to fix broken author css to ensure text
remains read-able. Note that per the above paragraph, such users will likely
want to set `widget.content.allow-gtk-dark-theme` to `true`.

## Permission Requirements Explanations ##

### <all_urls> ###
The extension inserts CSS and JavaScript into page content in order to fix
colors, and requires URL permissions for all sites in order to do so.

### storage ###
Extension settings use local storage.

### tabs ###
Extension requires access to tab data to get active URL. In order for frames to
see top-level tab URL, permissions for all tabs is needed, not just active tab.

### webNavigation ###
Extension is triggered on web navigation events.

## Input Elements

The primary purpose of this extension is to fix input elements, which are drawn
with native widgets in the user's dark style. Many website authors assume that
such elements are a dark-on-light style by default, and will only set one color
in their styles. This results in poor contrast when drawn with the dark native
widgets.

This extension checks if only one of the colors has been defined (foreground
color, or background color/image), and defines the unset property as needed.
Elements with both colors defined or both colors undefined remain unchanged.
Elements which already have good contrast (e.g. author is running their own dark
styling) are also unchanged.

In comparison to UserStyles.css or similar fixes, this extension tries to
minimize changes that fix the contrast issue. Thus native styles are retained if
possible.

## Use with "Use System Colors" or custom colors

Some users with a dark desktop theme may use the "Use System Colors" preference
to set the page default foreground/background to be light-on-dark. Alternately,
users may manually set a light-on-dark style with their own colors. Similar to
the situation with input elements, this can cause problems with author CSS.

This extension will detect the inverted default style and check for good
contrast on the page itself. The check is performed recursively starting at the
document root. Since colors are inherited by element children, the check bails
early once it has found a explicitly styled element (whether due to author
correctly setting both FG and BG, or extension making a fix). This keeps the
performance impact of the page scan negligible.

## Dynamic Elements

The extension performs required contrast checks (as above) for newly added or
re-styled elements. Elements that have already been checked are not
inspected, resulting in no slowdown with JavaScript heavy sites.

## IFrames and SVG images

The sub-documents of IFrames and SVG images included via `<embed>` are traversed
by the extension. The extension will try to correctly set the style of the inner
sub-document based on the styling of the parent.

For users with light-on-dark default colors, any SVG images included inline
within a document are also checked by the extension.

Note that SVG data included in an `<img>` tag cannot be accessed via JavaScript,
and this extension is unable to fix such cases.

## UI

The extension provides a toolbar button that allows users to either:
- Toggle the effects of the extension
- For users with light-on-dark default colors, force a custom stylesheet that
  emulates the black text / white background default.
Both toggles apply to the current tab only, and are temporary. A page refresh
undoes the effects.

Lastly, the extension options can also be accessed via the toolbar button menu.

## Options

The extension provides some options for users to fine tune the operation.

### Contrast Threshold

The extension does not modify element colors if it determines that they already
have good contrast. The definition of good contrast is determined by this
threshold. The extension uses the WCAG 2.0 definition of contrast
(see 1.4.3: https://www.w3.org/TR/WCAG20/#visual-audio-contrast). Higher numbers
make it more likely for the extension to change colors.

### Delay

The extension can conflict with other extensions that modify page CSS. To allow
the extension to run after any other custom CSS changes, a delay can be
configured before the extension does any checking.

### Override Lists

Some websites do not look good with this extension active. Two override lists
are provided to avoid unwanted effects.

#### Disable List

The extension is disabled for sites in this list. If the site works well without
the extension, but looks worse with it active, add the site to this list.

#### Force Standard List

The extension tries to force a default black text / white background style for
any sites in this list. If sites don't looks good or end up too busy with the
extension, this list can be used to revert to the stock browser style.

## Known Issues

The following list of issues are known and cannot be fixed at this time.

## AMO (addons.mozilla.org)

The extension does not function on addons.mozilla.org. This is a restriction
enforced by Mozilla for any extension, presumably as a security feature.
Unfortunately, the stylesheets on those pages are poorly written, and will
result in black-on dark styling for many of the input elements.

## Internal Pages

The extension cannot operate on internal pages, such as `about:` links,
option pages for other extensions, and so on. As above, this is a built-in
restriction of all web extensions.

## Intentionally Hidden Text

Some site authors deliberately set a foreground or a background color with the
intention of hiding text. When this extension encounters such an element, it has
no way of knowing the poor contrast is intentional, and thus will fix the
element. The extension should either be disabled for that specific site, or
custom CSS fixing the offending element should be applied via UserStyles.css or
similar.

## SVG

SVG elements included as `<img>` cannot be traversed via JavaScript. If the SVG
uses the 'currentColor' string for colors, these are pulled from the browser
default colors, independent of the styling of the enclosing page. With no access
to the SVG DOM, this extension cannot fix such cases. This is currently a major
issue with with Wikipedia formulas, which will render in the user's selected
foreground color, on a white background as set by the Wikipedia CSS. The only
fix is to use custom CSS to force colors background on the parent page to ensure
correct contrast (in the case of Wikipedia, force the background to be dark).

## Element positioning

Some sites explicitly place elements outside of the normal layout flow. This
extension relies on the fact that children inherit parent styles to keep fixes
small and performant. The extension is unable to know that an element may have
been moved above another element resulting in poor contrast. Forcing standard
colors may alleviate the issue on such sites.

## Cross-origin iFrames

When trying to fix all elements, and iframes are involved, the extensions must
decide how to style an iframe based on what the parent does (if parent styles
have been fixed, then iframe should be forced into standard colors, otherwise
processed normally). This communication channel between the iframe and the
parent is restricted when the frames are cross-origin, which blocks access to
properties that the parent needs to determine if a fix is needed. This will
result in the extensions failing to work in iframes on certain sites, which may
require adding the site to one of the override lists.
