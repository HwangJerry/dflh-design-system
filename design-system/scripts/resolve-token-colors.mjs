// Resolve semantic color aliases without mutating the canonical token source.
const paletteAliasPattern = /^\{palette\.([a-z][A-Za-z0-9]*)\}$/;

export function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
}

export function isPaletteAlias(value) {
  return typeof value === 'string' && paletteAliasPattern.test(value);
}

export function resolveColor(value, palette, scheme = 'light') {
  if (isHexColor(value)) return value;
  const alias = typeof value === 'string' && value.match(paletteAliasPattern);
  if (!alias) throw new Error(`Invalid color value: ${JSON.stringify(value)}`);
  const resolved = palette?.[scheme]?.[alias[1]];
  if (!isHexColor(resolved)) {
    throw new Error(`Alias ${value} must reference a hex color at palette.${scheme}.${alias[1]}.`);
  }
  return resolved;
}

export function resolveColorMap(colors, palette, scheme = 'light') {
  return Object.fromEntries(Object.entries(colors).map(([key, value]) => (
    [key, resolveColor(value, palette, scheme)]
  )));
}
