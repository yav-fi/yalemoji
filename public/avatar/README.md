# Yalemoji avatar assets

Put exported SVG layers in these directories:

```text
public/avatar/
  face/
  hair-back/       # numbered to match hair-front
  hair-front/      # numbered to match hair-back
  eyes/
  brows/
  mouth/
  accessories/
  background/
  nose/            # fixed layer; not user-selectable
```

Every file must use the same `viewBox="0 0 502 502"`. Do not crop a layer to
its visible artwork: shared canvas coordinates are what make the files stack.

Face and hair SVGs may use two palette slots:

```svg
fill="var(--avatar-primary)"
fill="var(--avatar-secondary)"
```

The editor supplies both colors when the user selects one visible swatch. Palette
entries use numeric IDs only; no user-facing skin or hair names are stored. Eyes,
brows, mouths, accessories, and backgrounds should keep their authored colors.
The nose is always rendered above the selected face and is not listed as an
editor category.

Hair styles are paired by filename: `hair-back/12.svg` and
`hair-front/12.svg` are one selectable option. The back renders behind the face;
the front renders above the facial features.

After adding a file, add its `id`, label, and public path to
`config/avatar-options.ts`. Example:

```ts
{ id: "eyes-01", label: "Classic", src: "/avatar/eyes/eyes-01.svg", default: true }
```

`default: true` is optional. Core categories use their first option when no
explicit default is set. Accessories and backgrounds start unselected.

SVG files are treated as trusted first-party source because the editor loads
their markup inline to support palette variables. Do not place unreviewed SVGs
from users or remote sources in these folders.
