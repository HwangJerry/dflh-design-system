# Hall of Fame laurel

Canonical, original vector artwork for the native Hall hero and gold donor cards.
Updated 2026-11-09 following the owner's request to replace the rough ellipse-based wreath.

- `hero.svg`: nine pointed leaves per branch, joined to a curved stem with mirrored geometry.
- `card.svg`: six broader leaves per branch, retaining clear gaps at the 30-point card size.
- Both use a 64 × 56 viewport, an open crown, crossed stems and a transparent background.
- Monochrome template rendering consumes the existing light/dark Hall emblem color tokens.
- No donor text, crown or extra badge is baked into the artwork.

Export both native formats with `python3 design-system/scripts/generate-hall-laurel.py`
from the workspace root; add `--check` to check that copies match. Android's existing
`extract_hall_vectors.py` delegates to this exporter so the historical HTML mockup
cannot overwrite the refined artwork. iOS SVG and Android VectorDrawable share the
same path geometry and reflection transform.
