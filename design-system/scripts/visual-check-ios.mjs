#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolveSiblingRepository, siblingSkipMessage } from './sibling-repositories.mjs';

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const root = process.cwd();
const manifestPath = path.join(root, 'design-system', 'verification', 'ios-snapshots', 'visual-evidence-manifest.json');
const baselineDir = path.join(root, 'design-system', 'verification', 'ios-snapshots', 'baseline');
const captureDir = path.join(root, 'design-system', 'verification', 'ios-snapshots', 'captures');
const diffDir = path.join(root, 'design-system', 'verification', 'ios-snapshots', 'diffs');
const reportPath = path.join(root, 'design-system', 'verification', 'reports', 'visual-check-ios.json');
const acceptedDeltaPath = path.join(root, 'design-system', 'verification', 'reports', 'accepted-deltas.json');
const decisionLogPath = path.join(root, 'design-system', 'verification', 'ios-snapshots', 'decision-log.md');
const iosRepository = resolveSiblingRepository(root, 'ios');
const appProjectPath = path.join(iosRepository.path, 'dflh-saf-v2-swift.xcodeproj');
const derivedDataPath = path.join(iosRepository.path, 'build', 'VisualRegressionDerivedData');
const appBundlePath = path.join(derivedDataPath, 'Build', 'Products', 'Debug-iphonesimulator', 'DflhSafV2Swift.app');
const bundleIdentifier = process.env.DFLH_IOS_VISUAL_BUNDLE_ID ?? 'com.daeil.dflhsafv2';
const scheme = process.env.DFLH_IOS_VISUAL_SCHEME ?? 'DflhSafV2Swift';
const simulatorName = process.env.DFLH_IOS_VISUAL_DEVICE ?? 'iPhone 15';
const captureDelayMs = Number.parseInt(process.env.DFLH_IOS_VISUAL_CAPTURE_DELAY_MS ?? '1800', 10);
const maxChangedPixelRatio = Number.parseFloat(process.env.DFLH_IOS_MAX_CHANGED_PIXEL_RATIO ?? '0');
const pixelThreshold = Number.parseInt(process.env.DFLH_IOS_PIXEL_THRESHOLD ?? '0', 10);

const runMode = (process.env.DFLH_IOS_VISUAL_MODE ?? 'guard').toLowerCase();
const shouldGenerateCaptures = process.env.DFLH_IOS_VISUAL_CAPTURE === '1' || runMode === 'capture';
const manifest = readManifest();
const accepted = loadAcceptedDeltas();
await fs.promises.mkdir(baselineDir, { recursive: true });
await fs.promises.mkdir(captureDir, { recursive: true });
await fs.promises.mkdir(diffDir, { recursive: true });
await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });

if (!iosRepository.exists) {
  const skipMessage = siblingSkipMessage(iosRepository, 'iOS visual check');
  const report = {
    generatedAt: new Date().toISOString(),
    mode: runMode,
    generatedCaptures: false,
    simulator: null,
    manifest: manifestPath,
    diffDir,
    checks: [],
    summary: {
      totalChecks: 0,
      changedCount: 0,
      acceptedCount: 0,
      missingCaptureCount: 0,
      missingBaselineCount: 0,
      errorCount: 0,
      baselineCreatedCount: 0,
      baselineUpdatedCount: 0,
      diffCount: 0,
    },
    skipped: [skipMessage],
  };
  console.log(skipMessage);
  await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const checks = [];
let failureCount = 0;
let acceptedCount = 0;
let simulatorUDID = process.env.DFLH_IOS_VISUAL_UDID;

if (shouldGenerateCaptures) {
  simulatorUDID = await generateSimulatorCaptures();
}

for (const target of manifest.targetScreens ?? []) {
  for (const fileName of target.expectedFiles ?? []) {
    const routeMeta = parseRouteMeta(fileName);
    const baselinePath = path.join(baselineDir, fileName);
    const capturePath = path.join(captureDir, fileName);

    const baselineExists = fs.existsSync(baselinePath);
    const captureExists = fs.existsSync(capturePath);
    const diffPath = path.join(diffDir, fileName);

    if (!captureExists) {
      checks.push({
        route: routeMeta.route,
        viewport: routeMeta.viewport,
        filename: fileName,
        status: baselineExists ? 'missing-capture' : 'missing-both',
        capture: capturePath,
        baseline: baselinePath,
        diff: diffPath,
        mandatoryScreens: target.mandatoryScreens ?? [],
      });
      failureCount += 1;
      continue;
    }

    const captureBuffer = fs.readFileSync(capturePath);
    const captureHash = sha256(captureBuffer);

    if (runMode === 'capture') {
      const previousBaselineHash = baselineExists ? sha256(fs.readFileSync(baselinePath)) : null;
      await fs.promises.copyFile(capturePath, baselinePath);
      checks.push({
        route: routeMeta.route,
        viewport: routeMeta.viewport,
        filename: fileName,
        status: baselineExists ? 'baseline-updated' : 'baseline-created',
        capture: capturePath,
        baseline: baselinePath,
        diff: diffPath,
        hash: captureHash,
        previousBaselineHash,
      });
      continue;
    }

    if (!baselineExists) {
      checks.push({
        route: routeMeta.route,
        viewport: routeMeta.viewport,
        filename: fileName,
        status: 'missing-baseline',
        capture: capturePath,
        baseline: baselinePath,
        diff: diffPath,
        hash: captureHash,
      });
      failureCount += 1;
      continue;
    }

    const baselineHash = sha256(fs.readFileSync(baselinePath));
    const comparison = comparePngFiles(baselinePath, capturePath, diffPath, pixelThreshold);
    const visuallyChanged = baselineHash !== captureHash && comparison.changedPixelRatio > maxChangedPixelRatio;
    const acceptedDelta = visuallyChanged ? isAccepted(target.name ?? routeMeta.route, routeMeta.viewport, captureHash, baselineHash, fileName) : null;
    const status = visuallyChanged ? (acceptedDelta ? 'changed-accepted' : 'changed') : 'match';

    checks.push({
      route: routeMeta.route,
      viewport: routeMeta.viewport,
      filename: fileName,
      status,
      capture: capturePath,
      baseline: baselinePath,
      diff: comparison.diffWritten ? diffPath : null,
      hash: captureHash,
      baselineHash,
      changedPixelRatio: comparison.changedPixelRatio,
      changedPixels: comparison.changedPixels,
      totalPixels: comparison.totalPixels,
      width: comparison.width,
      height: comparison.height,
      pixelThreshold,
      maxChangedPixelRatio,
      acceptedDeltaReason: acceptedDelta?.reason,
      approvedBy: acceptedDelta?.approvedBy,
      approvedAt: acceptedDelta?.approvedAt,
    });

    if (status === 'changed') {
      failureCount += 1;
    }
    if (acceptedDelta) {
      acceptedCount += 1;
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: runMode,
  generatedCaptures: shouldGenerateCaptures,
  simulator: simulatorUDID ? { udid: simulatorUDID, name: simulatorName } : null,
  manifest: manifestPath,
  diffDir,
  pixelTolerance: {
    maxChangedPixelRatio,
    pixelThreshold,
  },
  checks,
  summary: {
    totalChecks: checks.length,
    changedCount: checks.filter((entry) => entry.status === 'changed').length,
    acceptedCount,
    missingCaptureCount: checks.filter((entry) => entry.status === 'missing-capture' || entry.status === 'missing-both').length,
    missingBaselineCount: checks.filter((entry) => entry.status === 'missing-baseline').length,
    errorCount: checks.filter((entry) => entry.status === 'error').length,
    baselineCreatedCount: checks.filter((entry) => entry.status === 'baseline-created').length,
    baselineUpdatedCount: checks.filter((entry) => entry.status === 'baseline-updated').length,
    diffCount: checks.filter((entry) => entry.diff).length,
  },
};

if (failureCount > 0) {
  manifest.status = 'failed';
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const message = [
    'iOS evidence check failed:',
    `- missing captures/baselines: ${failureCount}`,
    `- report: ${reportPath}`,
    '- Capture command: DFLH_IOS_VISUAL_CAPTURE=1 npm run visual-check-ios',
    '- Baseline update command: DFLH_IOS_VISUAL_MODE=capture npm run visual-check-ios',
  ].join('\n');
  console.error(message);
}

await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failureCount > 0) {
  const existingLog = fs.existsSync(decisionLogPath) ? fs.readFileSync(decisionLogPath, 'utf8') : '';
  const statusLines = checks
    .filter((entry) => entry.status === 'missing-baseline' || entry.status === 'missing-capture' || entry.status === 'missing-both')
    .map((entry) => `- ${entry.filename}: ${entry.status}`);
  const updateText = [
    existingLog,
    '\n## Latest verification result',
    `- runMode: ${runMode}`,
    `- generatedAt: ${report.generatedAt}`,
    '- pending items:',
    ...statusLines,
    '- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.',
    '',
  ]
    .join('\n');
  await fs.promises.writeFile(decisionLogPath, updateText, 'utf8');
  process.exit(1);
}

if (runMode === 'capture') {
  manifest.status = 'captured';
} else {
  manifest.status = 'passed';
}
manifest.generatedAt = new Date().toISOString();
manifest.captures = checks;
await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`iOS visual parity check passed. report: ${reportPath}`);
if (acceptedCount > 0) {
  console.log(`accepted deltas applied: ${acceptedCount}`);
}

async function generateSimulatorCaptures() {
  ensureCommand('xcrun');
  ensureCommand('xcodebuild');

  const udid = simulatorUDID ?? resolveSimulatorUDID(simulatorName);
  console.log(`Building ${scheme} for ${simulatorName} (${udid}) visual regression capture...`);
  execFileSync('xcodebuild', [
    '-project',
    appProjectPath,
    '-scheme',
    scheme,
    '-configuration',
    'Debug',
    '-destination',
    `platform=iOS Simulator,id=${udid}`,
    '-derivedDataPath',
    derivedDataPath,
    'build',
  ], { stdio: 'inherit' });

  bootSimulator(udid);
  spawnSync('xcrun', ['simctl', 'terminate', udid, bundleIdentifier], { stdio: 'ignore' });
  spawnSync('xcrun', ['simctl', 'uninstall', udid, bundleIdentifier], { stdio: 'ignore' });
  execFileSync('xcrun', ['simctl', 'install', udid, appBundlePath], { stdio: 'inherit' });

  for (const fileName of expectedFileNames()) {
    const capturePath = path.join(captureDir, fileName);
    const screen = visualScreenForFile(fileName);
    const visualEnvironment = {
      ...process.env,
      SIMCTL_CHILD_DFLH_VISUAL_TEST: '1',
      SIMCTL_CHILD_DFLH_VISUAL_TEST_SCREEN: screen,
    };
    if (screen === 'messages-thread') {
      visualEnvironment.SIMCTL_CHILD_DFLH_VISUAL_TEST_CONVERSATION = '2101';
    }
    if (screen === 'feed') {
      visualEnvironment.SIMCTL_CHILD_DFLH_VISUAL_TEST_POST = '301';
    }
    execFileSync('xcrun', [
      'simctl',
      'launch',
      '--terminate-running-process',
      udid,
      bundleIdentifier,
    ], {
      stdio: 'inherit',
      env: visualEnvironment,
    });
    await delay(captureDelayMs);
    execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', capturePath], { stdio: 'inherit' });
  }

  return udid;
}

function expectedFileNames() {
  return [...new Set((manifest.targetScreens ?? []).flatMap((target) => target.expectedFiles ?? []))];
}

function visualScreenForFile(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('messagesthread')) return 'messages-thread';
  if (normalized.includes('messageslist')) return 'messages';
  if (normalized.includes('mypage')) return 'mypage';
  if (normalized.includes('profile')) return 'profile';
  return 'feed';
}

function ensureCommand(command) {
  const result = spawnSync('/usr/bin/env', ['which', command], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Required command not found: ${command}`);
  }
}

function resolveSimulatorUDID(name) {
  const output = execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { encoding: 'utf8' });
  const devices = JSON.parse(output).devices ?? {};
  for (const runtimeDevices of Object.values(devices)) {
    const match = runtimeDevices.find((device) => device.name === name && device.isAvailable);
    if (match) return match.udid;
  }
  throw new Error(`No available iOS simulator named "${name}". Set DFLH_IOS_VISUAL_DEVICE or DFLH_IOS_VISUAL_UDID.`);
}

function bootSimulator(udid) {
  const bootResult = spawnSync('xcrun', ['simctl', 'boot', udid], { encoding: 'utf8' });
  if (bootResult.status !== 0 && !`${bootResult.stderr}${bootResult.stdout}`.includes('Unable to boot device in current state: Booted')) {
    throw new Error(`Failed to boot simulator ${udid}: ${bootResult.stderr || bootResult.stdout}`);
  }
  execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'inherit' });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    return {
      generatedAt: new Date().toISOString(),
      status: 'missing',
      targetScreens: [],
      captures: [],
    };
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function loadAcceptedDeltas() {
  if (!fs.existsSync(acceptedDeltaPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(acceptedDeltaPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed?.entries ?? [];
  } catch {
    return [];
  }
}

function parseRouteMeta(fileName) {
  const name = fileName.replace(/\.png$/i, '');
  const [prefix, ...rest] = name.split('-');
  const viewport = rest.length > 0 ? rest[rest.length - 1] : 'unknown';
  const route = rest.length > 1 ? `${prefix}-${rest.slice(0, -1).join('-')}` : prefix;
  return { route: route.toLowerCase(), viewport };
}

function isAccepted(route, viewport, hash, baselineHash, filename) {
  return (
    accepted.find((entry) => {
      if (!entry) return false;
      const routeMatch = entry.route === route || entry.route === filename || entry.route === `${route}-${viewport}`;
      const viewportMatch = entry.viewport === viewport;
      const hashMatch = entry.hash ? entry.hash === hash : true;
      const baselineMatch = entry.baselineHash ? entry.baselineHash === baselineHash : true;
      return routeMatch && viewportMatch && hashMatch && baselineMatch;
    }) ?? null
  );
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function comparePngFiles(baselinePath, capturePath, diffPath, threshold) {
  const baseline = readPng(fs.readFileSync(baselinePath));
  const capture = readPng(fs.readFileSync(capturePath));
  const width = Math.max(baseline.width, capture.width);
  const height = Math.max(baseline.height, capture.height);
  const totalPixels = width * height;
  const diff = Buffer.alloc(width * height * 4);
  let changedPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const outputOffset = (y * width + x) * 4;
      const baselinePixel = pixelAt(baseline, x, y);
      const capturePixel = pixelAt(capture, x, y);
      const delta =
        Math.abs(baselinePixel[0] - capturePixel[0]) +
        Math.abs(baselinePixel[1] - capturePixel[1]) +
        Math.abs(baselinePixel[2] - capturePixel[2]) +
        Math.abs(baselinePixel[3] - capturePixel[3]);

      if (delta > threshold) {
        changedPixels += 1;
        diff[outputOffset] = 255;
        diff[outputOffset + 1] = 48;
        diff[outputOffset + 2] = 64;
        diff[outputOffset + 3] = 255;
      } else {
        diff[outputOffset] = Math.round(capturePixel[0] * 0.25 + 245 * 0.75);
        diff[outputOffset + 1] = Math.round(capturePixel[1] * 0.25 + 245 * 0.75);
        diff[outputOffset + 2] = Math.round(capturePixel[2] * 0.25 + 245 * 0.75);
        diff[outputOffset + 3] = 255;
      }
    }
  }

  const diffWritten = changedPixels > 0;
  if (diffWritten) {
    fs.writeFileSync(diffPath, writePng({ width, height, data: diff }));
  } else if (fs.existsSync(diffPath)) {
    fs.rmSync(diffPath);
  }

  return {
    changedPixelRatio: totalPixels === 0 ? 1 : changedPixels / totalPixels,
    changedPixels,
    totalPixels,
    width,
    height,
    diffWritten,
  };
}

function pixelAt(image, x, y) {
  if (x >= image.width || y >= image.height) return [0, 0, 0, 0];
  const offset = (y * image.width + x) * 4;
  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ];
}

function readPng(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('Only PNG screenshots are supported.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = null;
  let bitDepth = null;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Only 8-bit RGBA PNG screenshots are supported. Received bitDepth=${bitDepth}, colorType=${colorType}.`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const data = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const rawRow = inflated.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const row = unfilterRow(rawRow, previousRow, filter, bytesPerPixel);
    row.copy(data, y * stride);
    previousRow = row;
  }

  return { width, height, data };
}

function unfilterRow(rawRow, previousRow, filter, bytesPerPixel) {
  const row = Buffer.alloc(rawRow.length);
  for (let i = 0; i < rawRow.length; i += 1) {
    const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
    const up = previousRow[i] ?? 0;
    const upLeft = i >= bytesPerPixel ? previousRow[i - bytesPerPixel] : 0;
    switch (filter) {
      case 0:
        row[i] = rawRow[i];
        break;
      case 1:
        row[i] = (rawRow[i] + left) & 0xff;
        break;
      case 2:
        row[i] = (rawRow[i] + up) & 0xff;
        break;
      case 3:
        row[i] = (rawRow[i] + Math.floor((left + up) / 2)) & 0xff;
        break;
      case 4:
        row[i] = (rawRow[i] + paethPredictor(left, up, upLeft)) & 0xff;
        break;
      default:
        throw new Error(`Unsupported PNG filter type: ${filter}`);
    }
  }
  return row;
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function writePng(image) {
  const rows = [];
  const stride = image.width * 4;
  for (let y = 0; y < image.height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(image.data.subarray(y * stride, y * stride + stride));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
