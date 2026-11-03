import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveColorMap } from '../resolve-token-colors.mjs';

const tokens = JSON.parse(fs.readFileSync(new URL('../../tokens/design-tokens.json', import.meta.url)));
const generator = fileURLToPath(new URL('../generate-platform-tokens.mjs', import.meta.url));
const kebab = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const capitalize = (key) => key[0].toUpperCase() + key.slice(1);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hall-tokens-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'design-system/tokens'), { recursive: true });
  const source = structuredClone(tokens);
  const save = () => fs.writeFileSync(path.join(root, 'design-system/tokens/design-tokens.json'), JSON.stringify(source));
  // Real-looking directories contain only synthetic sentinels. --only=self must not copy into them.
  const siblings = ['web', 'ios', 'android'].map((name) => path.join(root, name));
  for (const sibling of siblings) {
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, 'sentinel'), 'synthetic');
  }
  const run = (...args) => spawnSync(process.execPath, [generator, '--only=self', ...args], {
    cwd: root, encoding: 'utf8', env: {
      ...process.env, DFLH_SKIP_TOKEN_VALIDATION: '1',
      DFLH_WEB_REPO: siblings[0], DFLH_SWIFT_REPO: siblings[1], DFLH_KOTLIN_REPO: siblings[2],
    },
  });
  const read = (file) => fs.readFileSync(path.join(root, 'design-system/platform', file), 'utf8');
  return { source, save, run, read, siblings };
}

test('all motion tokens propagate with platform units, including new easing keys', (t) => {
  const f = fixture(t);
  // A synthetic new key prevents a regression to a hardcoded list containing only hallShimmer.
  f.source.motion.duration.fixtureSweep = '1234ms';
  f.source.motion.easing.fixtureSweep = 'cubic-bezier(0.2,0,0.8,1)';
  f.save();
  const generated = f.run();
  assert.equal(generated.status, 0, generated.stderr);
  const web = f.read('web/design-tokens.css');
  const swift = f.read('ios/DesignTokens.swift');
  const kotlin = f.read('android/DesignTokens.kt');
  for (const [key, value] of Object.entries(f.source.motion.duration)) {
    assert.ok(web.includes(`--motion-duration-${kebab(key)}: ${value};`), key);
    const swiftKey = key === 'default' ? '`default`' : key;
    assert.ok(swift.includes(`${swiftKey}: Double = ${parseFloat(value) / 1000} // seconds`), key);
    assert.ok(kotlin.includes(`${key}Ms = ${parseInt(value, 10)}L`), key);
  }
  for (const [key, value] of Object.entries(f.source.motion.easing)) {
    assert.ok(web.includes(`--motion-easing-${kebab(key)}: ${value};`), key);
    for (const output of [swift, kotlin]) {
      assert.ok(output.includes(`easing${capitalize(key)} = ${JSON.stringify(value)}`), key);
    }
  }
  assert.equal(f.run('--check').status, 0);
  for (const sibling of f.siblings) assert.deepEqual(fs.readdirSync(sibling), ['sentinel']);
  f.source.motion.duration.hallShimmer = '1600ms';
  f.save();
  assert.equal(f.run('--check').status, 1, 'motion edits must invalidate generated artifacts');
});

test('hall palette roles resolve on all targets and preserve both native schemes', (t) => {
  const f = fixture(t);
  f.save();
  assert.equal(f.run().status, 0);
  const web = f.read('web/design-tokens.css');
  const swift = f.read('ios/DesignTokens.swift');
  const kotlin = f.read('android/DesignTokens.kt');
  const light = resolveColorMap(tokens.colorSchemes.light, tokens.palette, 'light');
  const dark = resolveColorMap(tokens.colorSchemes.dark, tokens.palette, 'dark');
  const nativeDark = kotlin.split('object DesignTokens {')[1].split('object Dark {')[1];
  for (const key of Object.keys(tokens.colors).filter((key) => key.startsWith('hall'))) {
    assert.ok(light[key] && dark[key], `${key} needs both schemes`);
    assert.ok(web.includes(`--color-${kebab(key)}: ${light[key]};`), key);
    assert.ok(swift.includes(`${key} = Color(lightHex: "${light[key]}", darkHex: "${dark[key]}")`), key);
    assert.ok(kotlin.includes(`${key} = Color(0xFF${light[key].slice(1)})`), key);
    assert.ok(nativeDark.includes(`${key} = Color(0xFF${dark[key].slice(1)})`), key);
  }
});

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test('hall text meets 4.5:1 contrast on cards, gradient stops and sticky surfaces in both schemes', () => {
  for (const scheme of ['light', 'dark']) {
    const colors = resolveColorMap(tokens.colorSchemes[scheme], tokens.palette, scheme);
    const pairs = [
      ['hallHeroForeground', 'hallHeroBackground'],
      ['hallHeroForeground', 'hallTabActive'], ['hallTabInactive', 'hallTabBackground'],
      ['textPrimary', 'hallSectionHeaderBackground'], ['hallLabel', 'hallWallBackground'],
    ];
    for (const surface of ['hallGoldSurface', 'hallGoldGradientStart', 'hallGoldGradientEnd', 'hallSilverSurface', 'hallBronzeSurface', 'hallNeutralSurface']) {
      pairs.push(['textPrimary', surface], ['hallLabel', surface]);
    }
    for (const [foreground, background] of pairs) {
      const values = [luminance(colors[foreground]), luminance(colors[background])].sort((a, b) => b - a);
      const ratio = (values[0] + 0.05) / (values[1] + 0.05);
      assert.ok(ratio >= 4.5, `${scheme} ${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
    }
  }
});

test('four tier type scales and retained blank-wall tokens satisfy the spec', () => {
  for (const [tier, size, label] of [['Gold', 22, 13], ['Silver', 17, 13], ['Bronze', 16, 12], ['Neutral', 15, 12]]) {
    assert.equal(tokens.typography.size[`hall${tier}Name`], `${size}px`);
    assert.equal(tokens.typography.size[`hall${tier}Label`], `${label}px`);
  }
  assert.deepEqual(tokens.typography.weight, { regular: 400, medium: 500, semibold: 600, bold: 700 });
  assert.equal(tokens.sizing.hallNeutralBorderWidth, '0px');
  assert.ok(parseFloat(tokens.sizing.hallTouchTarget) >= 44);
  assert.equal(tokens.sizing.hallPlaqueHeight, '112px');
  assert.equal(tokens.sizing.hallWallTopFadeHeight, '48px');
  assert.equal(tokens.sizing.hallWallBottomFadeHeight, '56px');
  for (const scheme of ['light', 'dark']) {
    const colors = resolveColorMap(tokens.colorSchemes[scheme], tokens.palette, scheme);
    const actual = ['hallPlaqueSurface', 'hallPlaqueBorder', 'hallPlaqueHeading'].map((key) => colors[key]);
    const expected = scheme === 'light' ? ['#EFEDE6', '#C9C5B8', '#1A1A2E'] : ['#1B1B25', '#2A2A36', '#EDEDF2'];
    assert.deepEqual(actual, expected);
  }
});
