#!/usr/bin/env node
// Imports a Figma variable export (see design-system/docs/FIGMA_SYNC.md) into
// design-system/tokens/design-tokens.json. Only the token families listed in
// FIGMA_SYNC.md's mapping table are overwritten; everything else (colorSchemes,
// elevation, motion.easing, platformMapping, state, version, sourceOfTruth) is
// preserved as-is from the existing file.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportPath = path.join(root, 'design-system', 'tokens', '.figma-variables-export.json');
const tokenPath = path.join(root, 'design-system', 'tokens', 'design-tokens.json');

if (!fs.existsSync(exportPath)) {
  console.error(`Missing ${exportPath}. See design-system/docs/FIGMA_SYNC.md for how to produce it.`);
  process.exit(1);
}

const exportedVars = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

// Keys (relative to the token root) whose value is a ratio string like "0.76"
// rather than a pixel string. Everything else under sizing/layout is pixels.
const RATIO_KEYS = new Set(['layout.messageBubbleMaxWidthRatio']);

function setPath(obj, segments, value) {
  let cur = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (typeof cur[segments[i]] !== 'object' || cur[segments[i]] === null) {
      throw new Error(`Unexpected token path segment "${segments.slice(0, i + 1).join('.')}" — not an object in design-tokens.json`);
    }
    cur = cur[segments[i]];
  }
  cur[segments[segments.length - 1]] = value;
}

// Figma stores FLOAT variables as 32-bit floats, so round-tripped values like
// 0.08 come back as 0.07999999821186066. Round away that noise before writing.
function roundFloat(value) {
  return Math.round(value * 1e4) / 1e4;
}

function formatValue(dottedPath, type, value) {
  if (type === 'COLOR') return value; // already "#RRGGBB"
  if (type === 'STRING') return value;
  if (type === 'FLOAT') {
    const rounded = roundFloat(value);
    if (RATIO_KEYS.has(dottedPath)) return String(rounded);
    if (dottedPath.startsWith('opacity.') || dottedPath.startsWith('typography.weight.') || dottedPath.startsWith('iconography.lineWeight.')) {
      return rounded; // plain number, no unit
    }
    if (dottedPath.startsWith('motion.duration.')) return `${rounded}ms`;
    return `${rounded}px`;
  }
  throw new Error(`Unsupported Figma variable type "${type}" for "${dottedPath}"`);
}

// The Figma variable collection is named "color" (singular, matches the
// naming-convention doc) but the JSON root key is "colors" (plural).
const ROOT_SEGMENT_ALIASES = { color: 'colors' };

let applied = 0;
for (const { name, type, value } of exportedVars) {
  // Figma variable name -> token path, e.g. "sizing/headerHeight/web" -> ["sizing","headerHeight","web"]
  const rawSegments = name.split('/');
  const segments = [ROOT_SEGMENT_ALIASES[rawSegments[0]] ?? rawSegments[0], ...rawSegments.slice(1)];
  const dottedPath = segments.join('.');
  const formatted = formatValue(dottedPath, type, value);
  setPath(tokens, segments, formatted);
  applied += 1;
}

// Bump patch version so downstream consumers see a change.
const [maj, min, patch] = tokens.version.split('.').map(Number);
tokens.version = `${maj}.${min}.${patch + 1}`;

fs.writeFileSync(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`);
console.log(`Applied ${applied} Figma variables to ${path.relative(root, tokenPath)} (version -> ${tokens.version}).`);
console.log('Next: npm run validate-design-tokens && npm run generate-design-system && npm run verify-design-system');
