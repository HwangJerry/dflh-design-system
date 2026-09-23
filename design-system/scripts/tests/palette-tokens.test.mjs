import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const generator = fileURLToPath(new URL('../generate-platform-tokens.mjs', import.meta.url));
const validator = fileURLToPath(new URL('../validate-design-tokens.mjs', import.meta.url));
const source = JSON.parse(fs.readFileSync(new URL('../../tokens/design-tokens.json', import.meta.url)));
const schema = new URL('../../tokens/design-tokens.schema.json', import.meta.url);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'palette-tokens-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const tokenDir = path.join(root, 'design-system/tokens');
  fs.mkdirSync(tokenDir, { recursive: true });
  fs.copyFileSync(schema, path.join(tokenDir, 'design-tokens.schema.json'));
  const tokens = structuredClone(source);
  const save = () => fs.writeFileSync(path.join(tokenDir, 'design-tokens.json'), JSON.stringify(tokens));
  const run = (script, ...args) => spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      DFLH_SKIP_TOKEN_VALIDATION: '1',
      DFLH_WEB_REPO: path.join(root, 'absent-web'),
      DFLH_SWIFT_REPO: path.join(root, 'absent-ios'),
      DFLH_KOTLIN_REPO: path.join(root, 'absent-android'),
    },
  });
  const read = (file) => fs.readFileSync(path.join(root, 'design-system/platform', file), 'utf8');
  return { tokens, save, run, read };
}

test('palette edits propagate to each platform and keep base colors light', (t) => {
  const { tokens, save, run, read } = fixture(t);
  tokens.palette.light.brandPrimary = '#123456';
  tokens.palette.dark.brandPrimary = '#ABCDEF';
  // An equivalent raw light value is valid alongside an alias in colors.
  tokens.colorSchemes.light.headerTitle = '#123456';
  save();
  const validation = run(validator);
  assert.equal(validation.status, 0, validation.stderr);
  assert.doesNotMatch(validation.stdout, /colorSchemes\.rowSurface has identical/);
  const generated = run(generator);
  assert.equal(generated.status, 0, generated.stderr);

  const web = read('web/design-tokens.css');
  assert.match(web, /--palette-brand-primary: #123456;/);
  assert.match(web, /--color-header-title: #123456;/);
  assert.match(web, /--color-primary: #123456;/);
  assert.match(web, /--color-surface: #FAFAF8;/);
  assert.match(web, /--color-error: #EF4444;/);
  assert.match(web, /--color-row-surface: #FFFFFF;/);

  const swift = read('ios/DesignTokens.swift');
  assert.match(swift, /public enum DSPalette \{\s+public enum Light \{/);
  assert.match(swift, /public enum Dark \{[\s\S]*?brandPrimary = Color\(hex: "#ABCDEF"\)/);
  assert.match(swift, /headerTitle = Color\(lightHex: "#123456", darkHex: "#ABCDEF"\)/);
  assert.match(swift, /primary = Color\(hex: "#123456"\)/);

  const kotlin = read('android/DesignTokens.kt');
  assert.match(kotlin, /object DSPalette \{\s+object Light \{/);
  assert.match(kotlin, /object DesignTokens \{[\s\S]*?headerTitle = Color\(0xFF123456\)/);
  assert.match(kotlin, /object DesignTokens \{[\s\S]*?object Dark \{[\s\S]*?headerTitle = Color\(0xFFABCDEF\)/);
  assert.match(kotlin, /object Dark \{[\s\S]*?brandPrimary = Color\(0xFFABCDEF\)/);
  assert.match(kotlin, /object DesignTokens \{[\s\S]*?object Dark \{[\s\S]*?kakao = Color\(0xFFFEE500\)/);
  for (const output of [web, swift, kotlin]) assert.doesNotMatch(output, /\{palette\./);
  assert.equal(run(generator, '--check').status, 0);

  tokens.palette.dark.brandPrimary = '#FEDCBA';
  save();
  assert.equal(run(generator, '--check').status, 1, 'palette changes must invalidate generated artifacts');
});

const invalidCases = [
  ['missing palette', (tokens) => { delete tokens.palette; }, /Missing required token root section: palette/],
  ['missing required primitive', (tokens) => {
    delete tokens.palette.light.positive;
    delete tokens.palette.dark.positive;
  }, /missing required color: positive/],
  ['mismatched palette keys', (tokens) => { tokens.palette.light.extraInk = '#010203'; }, /must define the same palette keys/],
  ['non-hex palette entry', (tokens) => { tokens.palette.light.paper = '{palette.canvas}'; }, /palette.light.paper has invalid value/],
  ['unknown base alias', (tokens) => { tokens.colors.primary = '{palette.missing}'; }, /palette.light.missing/],
  ['unknown dark alias', (tokens) => { tokens.colorSchemes.dark.headerTitle = '{palette.missing}'; }, /palette.dark.missing/],
  ['malformed alias', (tokens) => { tokens.colors.primary = '{palette.BrandPrimary}'; }, /colors.primary has invalid value/],
  ['resolved light mismatch', (tokens) => { tokens.colorSchemes.light.headerTitle = '{palette.paper}'; }, /must match the default colors.headerTitle/],
];

for (const [name, mutate, message] of invalidCases) {
  test(`validator rejects ${name}`, (t) => {
    const { tokens, save, run } = fixture(t);
    mutate(tokens);
    save();
    const result = run(validator);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  });
}

test('generator rejects unresolved aliases even when validation is skipped', (t) => {
  const { tokens, save, run } = fixture(t);
  tokens.colorSchemes.dark.rowSurface = '{palette.missing}';
  save();
  const result = run(generator);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /palette.dark.missing/);
});
