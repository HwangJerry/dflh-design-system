#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tokenPath = path.join(root, 'design-system', 'tokens', 'design-tokens.json');
const schemaPath = path.join(root, 'design-system', 'tokens', 'design-tokens.schema.json');

const tokens = readJson(tokenPath);
const schema = readJson(schemaPath);

const requiredRootSections = [
  'version',
  'sourceOfTruth',
  'colors',
  'colorSchemes',
  'opacity',
  'typography',
  'spacing',
  'radius',
  'sizing',
  'elevation',
  'iconography',
  'layout',
  'motion',
  'state',
  'platformMapping',
];
const deprecatedRootSections = ['animation', 'semantics'];
const requiredStates = ['default', 'hover', 'press', 'focus', 'disabled', 'loading', 'empty', 'error'];
const intentionalDuplicateValues = new Set([
  'colors.primary/colors.textPrimary',
  'colors.catNoticeText/colors.primary',
  'colors.border/colors.primaryLight',
  'colors.catNoticeBg/colors.primaryLight',
  'colors.borderHover/colors.primaryMuted',
  'colors.catNoticeBorder/colors.primaryMuted',
  'colors.warningSubtle/colors.warmLight',
  'colors.errorLight/colors.errorSubtle',
  'colors.avatar1/colors.avatar5',
  'layout.cardGap/layout.feedPostDetailSectionSpacing',
  'spacing.3/layout.cardGap',
  'spacing.4/layout.feedPostDetailSpacing',
]);
const duplicateAllowedFamilies = new Set(['typography.weight', 'iconography.lineWeight']);

const errors = [];
const warnings = [];

validateSchemaDocument(schema);
validateRoot(tokens);
validateTokenMap('colors', tokens.colors, isHexColor);
validateColorSchemes();
validateTokenMap('opacity', tokens.opacity, isOpacityNumber);
validateTokenMap('typography.size', tokens.typography?.size, isPixel);
validateTokenMap('typography.weight', tokens.typography?.weight, isFontWeight);
validateTokenMap('spacing', tokens.spacing, isPixel);
validateTokenMap('radius', tokens.radius, isPixel);
validateNestedTokenMap('sizing', tokens.sizing, isPixelOrRatio);
validateTokenMap('elevation', tokens.elevation, isNonEmptyString);
validateTokenMap('iconography.size', tokens.iconography?.size, isPixel);
validateTokenMap('iconography.lineWeight', tokens.iconography?.lineWeight, isPositiveNumber);
validateNestedTokenMap('layout', tokens.layout, isPixelOrRatio);
validateTokenMap('motion.duration', tokens.motion?.duration, isDuration);
validateTokenMap('motion.easing', tokens.motion?.easing, isNonEmptyString);
validateStateTokens();
validatePlatformMapping();
validateDuplicateValues();

const summary = {
  tokenPath: path.relative(root, tokenPath),
  schemaPath: path.relative(root, schemaPath),
  version: tokens.version,
  categories: requiredRootSections.filter((section) => typeof tokens[section] === 'object'),
  warnings,
  errors,
};

console.log(JSON.stringify(summary, null, 2));

if (errors.length > 0) {
  console.error('Token validation failed:');
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('Token validation completed with warnings:');
  for (const warning of warnings) {
    console.warn(` - ${warning}`);
  }
}

console.log('Token validation passed.');

function validateSchemaDocument(schemaDocument) {
  if (schemaDocument.title !== 'DFLH design token source schema') {
    errors.push('design-tokens.schema.json title is missing or unexpected.');
  }
  if (!Array.isArray(schemaDocument.required)) {
    errors.push('design-tokens.schema.json must document required root sections.');
    return;
  }
  for (const section of requiredRootSections) {
    if (!schemaDocument.required.includes(section)) {
      errors.push(`design-tokens.schema.json is missing required section documentation: ${section}`);
    }
  }
}

function validateRoot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('design-tokens.json must be a JSON object.');
    return;
  }

  for (const section of requiredRootSections) {
    if (!(section in value)) {
      errors.push(`Missing required token root section: ${section}`);
    }
  }

  for (const section of deprecatedRootSections) {
    if (section in value) {
      errors.push(`Deprecated token root section is not allowed: ${section}`);
    }
  }

  const allowedSections = new Set(requiredRootSections);
  for (const section of Object.keys(value)) {
    if (!allowedSections.has(section)) {
      errors.push(`Unknown token root section: ${section}`);
    }
  }

  if (!/^\d+\.\d+\.\d+$/.test(value.version ?? '')) {
    errors.push('version must be semantic version format: x.y.z');
  }

  if (value.sourceOfTruth !== 'design-system/tokens/design-tokens.json') {
    errors.push('sourceOfTruth must be "design-system/tokens/design-tokens.json".');
  }

  validateString('typography.fontSans', value.typography?.fontSans);
  validateString('typography.fontSerif', value.typography?.fontSerif);
}

function validateStateTokens() {
  const states = tokens.state?.states;
  if (!Array.isArray(states)) {
    errors.push('state.states must be an array.');
    return;
  }
  for (const state of requiredStates) {
    if (!states.includes(state)) {
      errors.push(`state.states is missing required state: ${state}`);
    }
  }
  if (new Set(states).size !== states.length) {
    errors.push('state.states contains duplicate entries.');
  }
}

function validateColorSchemes() {
  const schemes = tokens.colorSchemes;
  if (!schemes || typeof schemes !== 'object' || Array.isArray(schemes)) {
    errors.push('colorSchemes must be an object.');
    return;
  }

  validateTokenMap('colorSchemes.light', schemes.light, isHexColor);
  validateTokenMap('colorSchemes.dark', schemes.dark, isHexColor);

  const lightKeys = Object.keys(schemes.light ?? {}).sort();
  const darkKeys = Object.keys(schemes.dark ?? {}).sort();
  if (lightKeys.join('/') !== darkKeys.join('/')) {
    errors.push('colorSchemes.light and colorSchemes.dark must define the same semantic color keys.');
  }

  for (const key of new Set([...lightKeys, ...darkKeys])) {
    if (!(key in (tokens.colors ?? {}))) {
      errors.push(`colorSchemes.${key} must reference an existing colors.${key} token.`);
      continue;
    }
    if (schemes.light?.[key] !== tokens.colors[key]) {
      errors.push(`colorSchemes.light.${key} must match the default colors.${key} value.`);
    }
    if (schemes.light?.[key] === schemes.dark?.[key]) {
      warnings.push(`colorSchemes.${key} has identical light and dark values; keep shared colors in colors only.`);
    }
  }
}

function validatePlatformMapping() {
  const mapping = tokens.platformMapping;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    errors.push('platformMapping must be an object.');
    return;
  }
  for (const platform of ['web', 'ios']) {
    const platformMapping = mapping[platform];
    if (!platformMapping || typeof platformMapping !== 'object' || Array.isArray(platformMapping)) {
      errors.push(`platformMapping.${platform} must be an object.`);
      continue;
    }
    validateString(`platformMapping.${platform}.format`, platformMapping.format);
    validateStringArray(`platformMapping.${platform}.consumers`, platformMapping.consumers);
    validateStringArray(`platformMapping.${platform}.notes`, platformMapping.notes);
  }
}

function validateTokenMap(label, map, predicate) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    errors.push(`${label} must be a token object.`);
    return;
  }
  if (Object.keys(map).length === 0) {
    errors.push(`${label} must not be empty.`);
  }
  for (const [key, value] of Object.entries(map)) {
    validateTokenName(`${label}.${key}`, key);
    if (!predicate(value)) {
      errors.push(`${label}.${key} has invalid value: ${JSON.stringify(value)}`);
    }
  }
}

function validateNestedTokenMap(label, map, predicate) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    errors.push(`${label} must be a token object.`);
    return;
  }
  if (Object.keys(map).length === 0) {
    errors.push(`${label} must not be empty.`);
  }
  for (const [key, value] of Object.entries(map)) {
    validateTokenName(`${label}.${key}`, key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        validateTokenName(`${label}.${key}.${nestedKey}`, nestedKey);
        if (!predicate(nestedValue)) {
          errors.push(`${label}.${key}.${nestedKey} has invalid value: ${JSON.stringify(nestedValue)}`);
        }
      }
      continue;
    }
    if (!predicate(value)) {
      errors.push(`${label}.${key} has invalid value: ${JSON.stringify(value)}`);
    }
  }
}

function validateDuplicateValues() {
  const values = new Map();
  collectComparableValues(tokens, []);

  for (const [value, refs] of values.entries()) {
    if (refs.length < 2) {
      continue;
    }
    for (let i = 0; i < refs.length; i += 1) {
      for (let j = i + 1; j < refs.length; j += 1) {
        const pair = [refs[i], refs[j]].sort().join('/');
        const familyPair = refs[i].split('.').slice(0, -1).join('.');
        const firstRoot = refs[i].split('.')[0];
        const secondRoot = refs[j].split('.')[0];
        if (firstRoot !== secondRoot) {
          continue;
        }
        if (!intentionalDuplicateValues.has(pair) && !duplicateAllowedFamilies.has(familyPair)) {
          warnings.push(`Duplicate token value ${JSON.stringify(value)} used by ${refs[i]} and ${refs[j]}. Keep only when the shared value has distinct semantic intent.`);
        }
      }
    }
  }

  function collectComparableValues(node, parts) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const nextParts = [...parts, key];
      if (nextParts[0] === 'colorSchemes') {
        continue;
      }
      if (isComparableScalar(value)) {
        const family = nextParts.slice(0, -1).join('.');
        if (family.startsWith('platformMapping') || family === 'state') {
          continue;
        }
        const normalizedValue = normalizeValue(value);
        const refs = values.get(normalizedValue) ?? [];
        refs.push(nextParts.join('.'));
        values.set(normalizedValue, refs);
        continue;
      }
      collectComparableValues(value, nextParts);
    }
  }
}

function validateTokenName(pathLabel, key) {
  const isSpacingKey = pathLabel.startsWith('spacing.');
  const isValidKey = isSpacingKey
    ? /^(0|[1-9]\d*)$/.test(key)
    : /^[a-z][a-zA-Z0-9]*$/.test(key);
  if (!isValidKey) {
    errors.push(`${pathLabel} uses invalid token name "${key}". Use lower camelCase names; spacing may use numeric scale keys.`);
  }
}

function validateString(pathLabel, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${pathLabel} must be a non-empty string.`);
  }
}

function validateStringArray(pathLabel, value) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    errors.push(`${pathLabel} must be a non-empty string array.`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isComparableScalar(value) {
  return typeof value === 'string' || typeof value === 'number';
}

function normalizeValue(value) {
  return String(value).trim().toLowerCase();
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
}

function isPixel(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)(\.\d+)?px$/.test(value);
}

function isPixelOrRatio(value) {
  return isPixel(value) || (typeof value === 'string' && /^0\.\d+$/.test(value));
}

function isDuration(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)ms$/.test(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOpacityNumber(value) {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && value > 0;
}

function isFontWeight(value) {
  return Number.isInteger(value) && value >= 100 && value <= 900 && value % 100 === 0;
}
