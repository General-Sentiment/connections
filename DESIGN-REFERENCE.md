# Are.na interface reference

Inspected live in the browser on 2026-09-09 (local date), using:

- https://www.are.na/explore
- https://www.are.na/michelle-sueann/agencies-qzdl3aqb_nk
- User-provided reference: `/Users/jk/Downloads/2026-q1-an_4sfxmefk.png`

The supplied Connections group URL returned Page not found in the signed-out browser. This does not establish whether it is private, renamed, or missing.

## Direction

Match the established Are.na interface closely. Generated mockups are exploratory, not implementation specifications. Use live DOM measurements and visual comparisons for implementation.

User requirements: no global toolbar or people-search field; large breadcrumb page header; conversation is a separate screen, never a sidebar; no “Paste an Are.na link” label. Blocks and channels have square content cells. All profile sections must use the same card sizing rules.

## Measured live values

Measurements below are from a 709 × 864 CSS-pixel viewport in dark mode; do not treat them as verified desktop breakpoints.

- Observed native typeface: Areal. User decision: use `Arial, Helvetica, sans-serif` for this project for now; do not add Areal.
- Page background: #000000.
- Heading and sampled channel foreground: #e5e5e5.
- Caption foreground: #b2b2b2.
- Breadcrumb heading: 28px, weight 700, 35px line height; 15px horizontal gap; wraps naturally.
- Main content inset: 65px on each side in observed viewport.
- Two grid columns: 282px each, 15px horizontal gap.
- Card content area: 282 × 282px, explicit aspect ratio 1 / 1.
- Full card including caption allocation: 282 × 327px.
- Caption begins 10px below square; allocation 35px tall; centered text, 12.5px / 16.875px; long titles truncated.
- Sample channel tile: centered flex content, 2px solid border, 10px inner padding, square corners.
- Channel title: 24px / 30px, weight 400, 5px 10px padding.
- Channel metadata: 12.5px / 16.875px; author weight 700; count and relative time below author, grouped centrally rather than anchored to bottom edge.
- Sample More button: 24px high, 12.5px weight 700, 10px horizontal padding, 5px icon gap, 3px corner radius.

## Rendering and behavior observed

- A square content cell is distinct from the entire card: captions live outside the square.
- Media can occupy less than the square and retain its native aspect ratio. Do not force every asset into an edge-to-edge square crop. Match image, link, embed, text, and channel renderers individually; sampled link preview IMG used fill on a square preview, so a single universal object-fit rule is insufficient.
- Information sections share grid alignment, with fine horizontal rules and compact label/value rows.
- Hovered card reveals Options and contextual Source/Connect or Follow/Connect controls.
- Channel colors/borders should follow native state/theme treatment; do not impose green on every channel.
- Significant whitespace separates page information from grid contents.

## Next implementation validation

Measure additional viewport sizes and native text/image/embed states before claiming exact parity. Compare actual rendered components against Are.na at matching viewport sizes. Keep the user's removed toolbar and separate conversation navigation while reusing native visual conventions.
