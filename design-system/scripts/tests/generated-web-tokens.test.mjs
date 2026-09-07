import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const generator = fileURLToPath(new URL('../generate-platform-tokens.mjs', import.meta.url));
const tokens = fileURLToPath(new URL('../../tokens/design-tokens.json', import.meta.url));

test('web copy is generated for standalone builds and drift is rejected', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'web-token-copy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'design-system/tokens'), { recursive: true });
  fs.copyFileSync(tokens, path.join(root, 'design-system/tokens/design-tokens.json'));
  const webRepo = path.join(root, 'web-checkout');
  fs.mkdirSync(webRepo);
  const env = {
    ...process.env, DFLH_SKIP_TOKEN_VALIDATION: '1', DFLH_WEB_REPO: webRepo,
    DFLH_SWIFT_REPO: path.join(root, 'absent-ios'), DFLH_KOTLIN_REPO: path.join(root, 'absent-android'),
  };
  const run = (...args) => spawnSync(process.execPath, [generator, ...args], { cwd: root, encoding: 'utf8', env });
  assert.equal(run().status, 0);
  const copy = path.join(webRepo, 'frontend/src/generated/design-tokens.css');
  assert.equal(fs.readFileSync(copy, 'utf8'), fs.readFileSync(path.join(root, 'design-system/platform/web/design-tokens.css'), 'utf8'));
  assert.equal(run('--check').status, 0);
  fs.appendFileSync(copy, '\n/* accidental manual edit */\n');
  const stale = run('--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /frontend\/src\/generated\/design-tokens.css is out of date/);
});
