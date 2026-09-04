# Fonts

Both faces are self-hosted rather than loaded from Google. Not only for speed:
this site argues that nothing about you leaves your phone, and a page making
that claim while every visitor's browser announces itself to a third party for
a typeface is arguing against itself.

| Face | Licence | Source |
|---|---|---|
| Literata | SIL Open Font License 1.1 | <https://fonts.google.com/specimen/Literata> |
| IBM Plex Sans | SIL Open Font License 1.1 | <https://fonts.google.com/specimen/IBM+Plex+Sans> |

The OFL permits redistribution and web embedding, including bundling with a
site, provided the fonts are not sold on their own and the licence travels with
them. Full text: <https://openfontlicense.org/>

## What is here

Four `.woff2` files — two faces, two subsets each. Both are **variable** fonts,
so a single file per subset covers weight 400 through 600 and the second weight
costs nothing.

`latin-ext` is separate and only downloads when a page actually contains its
characters. That is what Romanian needs — ă, â, î, ș, ț — and English never
triggers it, so an English visitor pays for neither.

## Re-fetching

They came from the Google Fonts CSS API, which returns the current `.woff2`
URLs for a given `User-Agent`. If they ever need refreshing, request the same
family string the layouts used to link, then take the `latin` and `latin-ext`
blocks and nothing else.
