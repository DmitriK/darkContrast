# Text Contrast for Dark Themes

Firefox extension that fixes low contrast text when using dark desktop theme

This extension is intended for Firefox users that have a light text/dark
background system theme.

The primary purpose of this extension is to fix input elements, which are drawn
with native widgets in a dark style, but may have an explicit foreground or
background color set by the page author which assumes a light style, resulting
in low contrast text. Th extension checks if only one of the colors has been
defined (foreground color, or background color/image), and defines the unset
property as needed. Elements with both colors defined or both colors undefined
remain unchanged.

The colors are set using a custom data attribute and a small stylesheet that
selects on the data attribute.

The extension also listens for DOM changes (element additions, class changes,
style changes) and fixes newly added or changed elements as needed. Elements
that have already been checked (evidenced by the existence of the data
attribute) are skipped, resulting in good performance even for site that
heavily rely on updating style via Javascript.

The extension will detect if the user has set the "use system colors" option in
Firefox. If set, the extension will additionally recuse through all elements
(independently of input elements) and apply color fixes.
