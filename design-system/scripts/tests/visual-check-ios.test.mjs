import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../visual-check-ios.mjs', import.meta.url));
const black = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');
const white = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=', 'base64');

function fixture(t, entries) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-visual-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const snapshots = path.join(root, 'design-system/verification/ios-snapshots');
  for (const dir of ['baseline', 'captures']) fs.mkdirSync(path.join(snapshots, dir), { recursive: true });
  fs.mkdirSync(path.join(root, 'dflh-saf-v2-swift'));
  for (const [filename, baseline, capture] of entries) {
    if (baseline) fs.writeFileSync(path.join(snapshots, 'baseline', filename), baseline);
    if (capture) fs.writeFileSync(path.join(snapshots, 'captures', filename), capture);
  }
  fs.writeFileSync(path.join(snapshots, 'visual-evidence-manifest.json'), JSON.stringify({
    targetScreens: [{ name: 'screen.feed', expectedFiles: entries.map(([name]) => name) }],
  }));
  return {
    snapshots,
    run(mode = 'guard') {
      const result = spawnSync(process.execPath, [script], {
        cwd: root, encoding: 'utf8',
        env: { ...process.env, DFLH_SWIFT_REPO: path.join(root, 'dflh-saf-v2-swift'), DFLH_IOS_VISUAL_MODE: mode, DFLH_IOS_VISUAL_CAPTURE: '0' },
      });
      const report = JSON.parse(fs.readFileSync(path.join(root, 'design-system/verification/reports/visual-check-ios.json')));
      return { ...result, report };
    },
  };
}

test('changed screenshots fail with accurate counts, instructions and persisted evidence', (t) => {
  const f = fixture(t, ['Feed', 'MessagesList', 'MessagesThread', 'MyPage'].map(name => [`iOS-${name}-mobile.png`, black, white]));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /changed screens: 4/);
  assert.match(result.stderr, /missing captures: 0/);
  assert.match(result.stderr, /missing baselines: 0/);
  assert.match(result.stderr, /npm run visual-check-ios:update-baseline/);
  assert.equal(result.report.summary.changedCount, 4);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.snapshots, 'visual-evidence-manifest.json')));
  assert.equal(manifest.captures.filter(c => c.status === 'changed').length, 4);
  const log = fs.readFileSync(path.join(f.snapshots, 'decision-log.md'), 'utf8');
  assert.match(log, /iOS-Feed-mobile.png: changed/);
  assert.doesNotMatch(log, /action: capture missing/);
});

test('missing-both counts both missing files, independently of changed screens', (t) => {
  const f = fixture(t, [['iOS-Feed-mobile.png', null, null], ['iOS-MyPage-mobile.png', black, null], ['iOS-MessagesList-mobile.png', null, white]]);
  const result = f.run();
  assert.equal(result.status, 1);
  assert.equal(result.report.summary.changedCount, 0);
  assert.equal(result.report.summary.missingCaptureCount, 2);
  assert.equal(result.report.summary.missingBaselineCount, 2);
});

test('matching pixels pass', (t) => {
  const result = fixture(t, [['iOS-Feed-mobile.png', black, black]]).run();
  assert.equal(result.status, 0);
  assert.equal(result.report.checks[0].status, 'match');
});

test('baseline update promotes reviewed captures without starting a simulator', (t) => {
  const f = fixture(t, [['iOS-Feed-mobile.png', black, white]]);
  const result = f.run('capture');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.generatedCaptures, false);
  assert.deepEqual(fs.readFileSync(path.join(f.snapshots, 'baseline/iOS-Feed-mobile.png')), white);
  assert.equal(f.run().status, 0);
});

test('only observed one-level RGB rounding is ignored; real changes still fail', (t) => {
  const nearBlack = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgZGT8DwABDQED5NTSmwAAAABJRU5ErkJggg==', 'base64');
  const result = fixture(t, [['iOS-Feed-mobile.png', black, nearBlack]]).run();
  assert.equal(result.status, 0);
  assert.equal(result.report.pixelTolerance.maxChangedPixelRatio, 0);
  assert.equal(fixture(t, [['iOS-Feed-mobile.png', black, white]]).run().status, 1);
});
