#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const root = process.cwd();
const outputPath = path.join(root, 'design-system', 'verification', 'visual-baseline-manifest.json');
const reportDir = path.join(root, 'design-system', 'verification', 'reports');
const androidBaselineDir = path.join(root, 'design-system', 'verification', 'android-snapshots', 'baseline');

const collections = [
  {
    platform: 'web',
    role: 'baseline',
    dir: path.join(root, 'design-system', 'verification', 'web-snapshots', 'baseline'),
  },
  {
    platform: 'web',
    role: 'latest-capture',
    dir: path.join(root, 'design-system', 'verification', 'web-snapshots', 'design'),
  },
  {
    platform: 'ios',
    role: 'baseline',
    dir: path.join(root, 'design-system', 'verification', 'ios-snapshots', 'baseline'),
  },
  {
    platform: 'ios',
    role: 'latest-capture',
    dir: path.join(root, 'design-system', 'verification', 'ios-snapshots', 'captures'),
  },
  {
    platform: 'android',
    role: 'baseline',
    dir: androidBaselineDir,
    optional: true,
  },
  {
    platform: 'cross-platform',
    role: 'diff',
    dir: path.join(root, 'design-system', 'verification', 'platform-diffs'),
  },
];

const reportFiles = [
  path.join(reportDir, 'visual-check-web.json'),
  path.join(reportDir, 'visual-check-ios.json'),
  path.join(reportDir, 'visual-platform-parity.json'),
  path.join(reportDir, 'visual-platform-parity.md'),
  path.join(reportDir, 'accepted-deltas.json'),
];

await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const screenshots = [];
try {
  for (const collection of collections) {
    const entries = await collectPngFiles(browser, collection);
    screenshots.push(...entries);
  }
} finally {
  await browser.close();
}

const reports = reportFiles.map((filePath) => fileEntry(filePath, 'report'));
const androidAvailable = screenshots.some((entry) => entry.platform === 'android' && entry.exists);
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot: root,
  versioning: {
    strategy: 'content-addressed-baseline-manifest',
    hashAlgorithm: 'sha256',
    manifestPath: path.relative(root, outputPath),
    note: 'The workspace root is not a Git repository; this manifest versions the visual baseline set by content hash and file path.',
  },
  platforms: {
    web: {
      baselineDir: 'design-system/verification/web-snapshots/baseline',
      latestCaptureDir: 'design-system/verification/web-snapshots/design',
      available: screenshots.some((entry) => entry.platform === 'web' && entry.role === 'baseline' && entry.exists),
    },
    ios: {
      baselineDir: 'design-system/verification/ios-snapshots/baseline',
      latestCaptureDir: 'design-system/verification/ios-snapshots/captures',
      available: screenshots.some((entry) => entry.platform === 'ios' && entry.role === 'baseline' && entry.exists),
    },
    android: {
      baselineDir: 'design-system/verification/android-snapshots/baseline',
      available: androidAvailable,
      status: androidAvailable ? 'available' : 'platform-unavailable',
      expectedFiles: [
        'Android-Feed-mobile.png',
        'Android-MessagesList-mobile.png',
        'Android-MessagesThread-mobile.png',
        'Android-MyPage-mobile.png',
      ],
    },
  },
  screenshotCount: screenshots.filter((entry) => entry.exists).length,
  reportCount: reports.filter((entry) => entry.exists).length,
  screenshots,
  reports,
};

manifest.manifestHash = sha256(Buffer.from(JSON.stringify({
  schemaVersion: manifest.schemaVersion,
  platforms: manifest.platforms,
  screenshots: manifest.screenshots,
  reports: manifest.reports,
}, null, 2)));

await fs.promises.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`visual baseline manifest written: ${outputPath}`);

async function collectPngFiles(browserInstance, collection) {
  if (!fs.existsSync(collection.dir)) {
    return collection.optional ? [] : [{
      platform: collection.platform,
      role: collection.role,
      path: path.relative(root, collection.dir),
      exists: false,
    }];
  }

  const files = fs.readdirSync(collection.dir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.png'))
    .sort();

  const entries = [];
  for (const fileName of files) {
    const filePath = path.join(collection.dir, fileName);
    const dimensions = await imageDimensions(browserInstance, filePath);
    entries.push({
      platform: collection.platform,
      role: collection.role,
      path: path.relative(root, filePath),
      fileName,
      exists: true,
      bytes: fs.statSync(filePath).size,
      sha256: sha256(fs.readFileSync(filePath)),
      width: dimensions.width,
      height: dimensions.height,
    });
  }
  return entries;
}

function fileEntry(filePath, role) {
  if (!fs.existsSync(filePath)) {
    return {
      role,
      path: path.relative(root, filePath),
      exists: false,
    };
  }
  return {
    role,
    path: path.relative(root, filePath),
    exists: true,
    bytes: fs.statSync(filePath).size,
    sha256: sha256(fs.readFileSync(filePath)),
  };
}

async function imageDimensions(browserInstance, filePath) {
  const page = await browserInstance.newPage();
  try {
    return await page.evaluate(
      async ({ sourceUrl }) => {
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error(`Failed to load image: ${sourceUrl}`));
          element.src = sourceUrl;
        });
        return { width: image.width, height: image.height };
      },
      { sourceUrl: imageDataUrl(filePath) },
    );
  } finally {
    await page.close();
  }
}

function imageDataUrl(filePath) {
  const encoded = fs.readFileSync(filePath).toString('base64');
  return `data:image/png;base64,${encoded}`;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
