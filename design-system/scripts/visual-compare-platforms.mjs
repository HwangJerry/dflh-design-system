#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const root = process.cwd();
const webBaselineDir = path.join(root, 'design-system', 'verification', 'web-snapshots', 'baseline');
const iosBaselineDir = path.join(root, 'design-system', 'verification', 'ios-snapshots', 'baseline');
const androidBaselineDir = path.join(root, 'design-system', 'verification', 'android-snapshots', 'baseline');
const diffDir = path.join(root, 'design-system', 'verification', 'platform-diffs');
const reportDir = path.join(root, 'design-system', 'verification', 'reports');
const jsonReportPath = path.join(reportDir, 'visual-platform-parity.json');
const markdownReportPath = path.join(reportDir, 'visual-platform-parity.md');
const acceptedDeltaPath = path.join(reportDir, 'accepted-deltas.json');

const pixelThreshold = Number.parseInt(process.env.DFLH_PLATFORM_PIXEL_THRESHOLD ?? '8', 10);
const maxChangedPixelRatio = Number.parseFloat(process.env.DFLH_PLATFORM_MAX_CHANGED_PIXEL_RATIO ?? '0.08');
const runMode = (process.env.DFLH_PLATFORM_PARITY_MODE ?? 'report').toLowerCase();

const screenPairs = [
  {
    screen: 'feed',
    viewport: 'mobile',
    web: 'feed-mobile.png',
    ios: 'iOS-Feed-mobile.png',
    android: 'Android-Feed-mobile.png',
  },
  {
    screen: 'messages',
    viewport: 'mobile',
    web: 'messages-mobile.png',
    ios: 'iOS-MessagesList-mobile.png',
    android: 'Android-MessagesList-mobile.png',
  },
  {
    screen: 'messages_thread',
    viewport: 'mobile',
    web: 'messages_thread-mobile.png',
    ios: 'iOS-MessagesThread-mobile.png',
    android: 'Android-MessagesThread-mobile.png',
  },
  {
    screen: 'mypage',
    viewport: 'mobile',
    web: 'mypage-mobile.png',
    ios: 'iOS-MyPage-mobile.png',
    android: 'Android-MyPage-mobile.png',
  },
];

await fs.promises.mkdir(diffDir, { recursive: true });
await fs.promises.mkdir(reportDir, { recursive: true });

const acceptedDeltas = loadAcceptedDeltas();
const browser = await chromium.launch({ headless: true });
const comparisons = [];
let failureCount = 0;

try {
  for (const pair of screenPairs) {
    comparisons.push(await comparePlatformPair(browser, pair, 'web', 'ios', webBaselineDir, iosBaselineDir, pair.web, pair.ios));

    const androidPath = path.join(androidBaselineDir, pair.android);
    if (fs.existsSync(androidPath)) {
      comparisons.push(await comparePlatformPair(browser, pair, 'web', 'android', webBaselineDir, androidBaselineDir, pair.web, pair.android));
    } else {
      comparisons.push({
        screen: pair.screen,
        viewport: pair.viewport,
        sourcePlatform: 'web',
        targetPlatform: 'android',
        status: 'platform-unavailable',
        reason: 'Android screenshot baseline directory or expected screenshot is not present.',
        source: path.join(webBaselineDir, pair.web),
        target: androidPath,
      });
    }
  }
} finally {
  await browser.close();
}

for (const comparison of comparisons) {
  if (comparison.status === 'changed' || comparison.status === 'missing-source' || comparison.status === 'missing-target' || comparison.status === 'error') {
    failureCount += 1;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: runMode,
  pixelTolerance: {
    maxChangedPixelRatio,
    pixelThreshold,
  },
  sources: {
    webBaselineDir,
    iosBaselineDir,
    androidBaselineDir,
    acceptedDeltaPath,
    diffDir,
  },
  summary: {
    totalComparisons: comparisons.length,
    matchCount: comparisons.filter((entry) => entry.status === 'match').length,
    changedCount: comparisons.filter((entry) => entry.status === 'changed').length,
    acceptedCount: comparisons.filter((entry) => entry.status === 'changed-accepted').length,
    unavailableCount: comparisons.filter((entry) => entry.status === 'platform-unavailable').length,
    missingCount: comparisons.filter((entry) => entry.status === 'missing-source' || entry.status === 'missing-target').length,
    errorCount: comparisons.filter((entry) => entry.status === 'error').length,
  },
  comparisons,
};

await fs.promises.writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.promises.writeFile(markdownReportPath, renderMarkdownReport(report), 'utf8');

if (failureCount > 0 && runMode === 'guard') {
  console.error(`visual-platform-parity failed: ${failureCount} unaccepted comparisons changed or errored.`);
  console.error(`report: ${jsonReportPath}`);
  process.exit(1);
}

console.log(`visual-platform-parity report written: ${jsonReportPath}`);
console.log(`markdown report written: ${markdownReportPath}`);

async function comparePlatformPair(browserInstance, pair, sourcePlatform, targetPlatform, sourceDir, targetDir, sourceFile, targetFile) {
  const sourcePath = path.join(sourceDir, sourceFile);
  const targetPath = path.join(targetDir, targetFile);
  const route = `${sourcePlatform}-${targetPlatform}-${pair.screen}`;
  const viewport = pair.viewport;

  if (!fs.existsSync(sourcePath)) {
    return {
      screen: pair.screen,
      viewport,
      sourcePlatform,
      targetPlatform,
      status: 'missing-source',
      source: sourcePath,
      target: targetPath,
    };
  }

  if (!fs.existsSync(targetPath)) {
    return {
      screen: pair.screen,
      viewport,
      sourcePlatform,
      targetPlatform,
      status: 'missing-target',
      source: sourcePath,
      target: targetPath,
    };
  }

  try {
    const sourceHash = sha256(fs.readFileSync(sourcePath));
    const targetHash = sha256(fs.readFileSync(targetPath));
    const diffPath = path.join(diffDir, `${route}-${viewport}.png`);
    const comparison = sourceHash === targetHash
      ? { changedPixelRatio: 0, changedPixels: 0, totalPixels: 0, sourceSize: null, targetSize: null }
      : await compareImages(browserInstance, sourcePath, targetPath, diffPath);
    const visuallyMatches = sourceHash === targetHash || comparison.changedPixelRatio <= maxChangedPixelRatio;
    const acceptedDelta = visuallyMatches
      ? null
      : isAccepted(route, viewport, targetHash, sourceHash, pair.screen, targetPlatform);

    return {
      screen: pair.screen,
      viewport,
      sourcePlatform,
      targetPlatform,
      status: visuallyMatches ? 'match' : (acceptedDelta ? 'changed-accepted' : 'changed'),
      source: sourcePath,
      target: targetPath,
      diff: sourceHash === targetHash ? undefined : diffPath,
      sourceHash,
      targetHash,
      changedPixelRatio: comparison.changedPixelRatio,
      changedPixels: comparison.changedPixels,
      totalPixels: comparison.totalPixels,
      sourceSize: comparison.sourceSize,
      targetSize: comparison.targetSize,
      normalizedComparisonSize: comparison.normalizedComparisonSize,
      acceptedDeltaReason: acceptedDelta?.reason,
      approvedBy: acceptedDelta?.approvedBy,
      approvedAt: acceptedDelta?.approvedAt,
    };
  } catch (error) {
    return {
      screen: pair.screen,
      viewport,
      sourcePlatform,
      targetPlatform,
      status: 'error',
      source: sourcePath,
      target: targetPath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function compareImages(browserInstance, sourcePath, targetPath, diffPath) {
  const page = await browserInstance.newPage();
  try {
    const result = await page.evaluate(
      async ({ sourceUrl, targetUrl, threshold }) => {
        const [sourceImage, targetImage] = await Promise.all([
          loadImage(sourceUrl),
          loadImage(targetUrl),
        ]);

        const targetScale = sourceImage.width / targetImage.width;
        const normalizedTargetHeight = Math.round(targetImage.height * targetScale);
        const width = sourceImage.width;
        const height = Math.min(sourceImage.height, normalizedTargetHeight);
        const totalPixels = width * height;
        const sourceData = drawImageData(sourceImage, width, height, sourceImage.width, sourceImage.height);
        const targetData = drawImageData(targetImage, width, height, targetImage.width, targetImage.height);
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = width;
        diffCanvas.height = height;
        const diffContext = diffCanvas.getContext('2d');
        const diffImage = diffContext.createImageData(width, height);
        let changedPixels = 0;

        for (let i = 0; i < sourceData.length; i += 4) {
          const delta =
            Math.abs(sourceData[i] - targetData[i]) +
            Math.abs(sourceData[i + 1] - targetData[i + 1]) +
            Math.abs(sourceData[i + 2] - targetData[i + 2]) +
            Math.abs(sourceData[i + 3] - targetData[i + 3]);
          const changed = delta > threshold;

          if (changed) {
            changedPixels += 1;
            diffImage.data[i] = 220;
            diffImage.data[i + 1] = 38;
            diffImage.data[i + 2] = 38;
            diffImage.data[i + 3] = 255;
          } else {
            diffImage.data[i] = Math.round(sourceData[i] * 0.35 + targetData[i] * 0.35 + 76);
            diffImage.data[i + 1] = Math.round(sourceData[i + 1] * 0.35 + targetData[i + 1] * 0.35 + 76);
            diffImage.data[i + 2] = Math.round(sourceData[i + 2] * 0.35 + targetData[i + 2] * 0.35 + 76);
            diffImage.data[i + 3] = 255;
          }
        }

        diffContext.putImageData(diffImage, 0, 0);

        return {
          changedPixelRatio: totalPixels === 0 ? 1 : changedPixels / totalPixels,
          changedPixels,
          totalPixels,
          sourceSize: { width: sourceImage.width, height: sourceImage.height },
          targetSize: { width: targetImage.width, height: targetImage.height },
          normalizedComparisonSize: { width, height },
          diffDataUrl: diffCanvas.toDataURL('image/png'),
        };

        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            image.src = src;
          });
        }

        function drawImageData(image, width, height, naturalWidth, naturalHeight) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, width, height);
          const scaledHeight = Math.round(naturalHeight * (width / naturalWidth));
          context.drawImage(image, 0, 0, width, scaledHeight);
          return context.getImageData(0, 0, width, height).data;
        }
      },
      {
        sourceUrl: imageDataUrl(sourcePath),
        targetUrl: imageDataUrl(targetPath),
        threshold: pixelThreshold,
      },
    );

    const diffBase64 = result.diffDataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.promises.writeFile(diffPath, Buffer.from(diffBase64, 'base64'));
    delete result.diffDataUrl;
    return result;
  } finally {
    await page.close();
  }
}

function renderMarkdownReport(reportData) {
  const lines = [
    '# Visual Platform Parity Report',
    '',
    `- Generated: ${reportData.generatedAt}`,
    `- Mode: ${reportData.mode}`,
    `- Pixel threshold: ${reportData.pixelTolerance.pixelThreshold}`,
    `- Max changed pixel ratio: ${reportData.pixelTolerance.maxChangedPixelRatio}`,
    '',
    '## Summary',
    '',
    `- Total comparisons: ${reportData.summary.totalComparisons}`,
    `- Matches: ${reportData.summary.matchCount}`,
    `- Changed: ${reportData.summary.changedCount}`,
    `- Accepted deviations: ${reportData.summary.acceptedCount}`,
    `- Platform unavailable: ${reportData.summary.unavailableCount}`,
    `- Missing evidence: ${reportData.summary.missingCount}`,
    `- Errors: ${reportData.summary.errorCount}`,
    '',
    '## Comparisons',
    '',
    '| Screen | Viewport | Pair | Status | Changed ratio | Diff | Deviation |',
    '| --- | --- | --- | --- | ---: | --- | --- |',
  ];

  for (const entry of reportData.comparisons) {
    const pair = `${entry.sourcePlatform} -> ${entry.targetPlatform}`;
    const changedRatio = typeof entry.changedPixelRatio === 'number' ? entry.changedPixelRatio.toFixed(6) : '';
    const diff = entry.diff ? path.relative(root, entry.diff) : '';
    const deviation = entry.acceptedDeltaReason ?? entry.reason ?? '';
    lines.push(`| ${entry.screen} | ${entry.viewport} | ${pair} | ${entry.status} | ${changedRatio} | ${diff} | ${deviation.replaceAll('|', '\\|')} |`);
  }

  lines.push(
    '',
    '## Intentional Deviations',
    '',
    'Intentional platform differences must be recorded in `design-system/verification/reports/accepted-deltas.json`.',
    'Use `route` values shaped as `web-ios-<screen>` or `web-android-<screen>` with `viewport`, `reason`, `approvedBy`, and `approvedAt`.',
    '',
    '## Android Availability',
    '',
    'Android comparisons are marked `platform-unavailable` until matching screenshots are added under `design-system/verification/android-snapshots/baseline/`.',
  );

  return `${lines.join('\n')}\n`;
}

function isAccepted(route, viewport, hash, baselineHash, screen, targetPlatform) {
  return acceptedDeltas.find((entry) => {
    if (!entry) return false;
    const routeMatch = entry.route === route || entry.route === screen || entry.route === `${targetPlatform}-${screen}`;
    const viewportMatch = entry.viewport === viewport;
    const hashMatch = entry.hash ? entry.hash === hash : true;
    const baselineMatch = entry.baselineHash ? entry.baselineHash === baselineHash : true;
    return routeMatch && viewportMatch && hashMatch && baselineMatch;
  }) ?? null;
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

function imageDataUrl(filePath) {
  const encoded = fs.readFileSync(filePath).toString('base64');
  return `data:image/png;base64,${encoded}`;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
