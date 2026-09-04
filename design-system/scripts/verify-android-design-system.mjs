#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveSiblingRepository, siblingSkipMessage } from './sibling-repositories.mjs';

const root = process.cwd();
const androidRepository = resolveSiblingRepository(root, 'android');
const androidRoot = path.join(androidRepository.path, 'design-system');
const generatedPlatformTokens = path.join(root, 'design-system', 'platform', 'android', 'DesignTokens.kt');
const copiedTokens = path.join(androidRoot, 'src', 'main', 'kotlin', 'com', 'dflh', 'designsystem', 'DesignTokens.kt');
const reportPath = path.join(root, 'design-system', 'verification', 'reports', 'android-design-system-integration.json');

const requiredFiles = [
  'src/main/kotlin/com/dflh/designsystem/DesignTokens.kt',
  'src/main/kotlin/com/dflh/designsystem/DesignSystemCompat.kt',
  'src/main/kotlin/com/dflh/designsystem/DSComponents.kt',
  'src/main/kotlin/com/dflh/designsystem/DesignSystemExports.kt',
  'src/main/kotlin/com/dflh/designsystem/screens/ScreenContracts.kt',
  'src/main/kotlin/com/dflh/designsystem/screens/ScreenTokenMaps.kt',
  'src/main/kotlin/com/dflh/designsystem/screens/TargetScreenDesignSystemBindings.kt',
  'README.md',
];

if (!androidRepository.exists) {
  const skipMessage = siblingSkipMessage(androidRepository, 'Android design-system verification');
  const report = {
    generatedAt: new Date().toISOString(),
    androidRoot: path.relative(root, androidRoot),
    generatedPlatformTokens: path.relative(root, generatedPlatformTokens),
    copiedTokens: path.relative(root, copiedTokens),
    requiredFiles: [],
    checks: {},
    warnings: [],
    errors: [],
    skipped: [skipMessage],
  };
  console.log(skipMessage);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const errors = [];
const warnings = [];

for (const relativePath of requiredFiles) {
  const filePath = path.join(androidRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing Android design-system file: ${path.relative(root, filePath)}`);
  }
}

if (fs.existsSync(generatedPlatformTokens) && fs.existsSync(copiedTokens)) {
  const generatedText = fs.readFileSync(generatedPlatformTokens, 'utf8');
  const copiedText = fs.readFileSync(copiedTokens, 'utf8');
  if (generatedText !== copiedText) {
    errors.push('Android copied token artifact is stale relative to design-system/platform/android/DesignTokens.kt');
  }
}

const kotlinFiles = requiredFiles
  .filter((relativePath) => relativePath.endsWith('.kt'))
  .map((relativePath) => path.join(androidRoot, relativePath))
  .filter((filePath) => fs.existsSync(filePath));
const kotlinText = kotlinFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

const forbiddenReferences = [
  'DSLayout.touchTarget',
  'DSLayout.safeBottomNavHeight',
  'DSLayout.feedHeroMinHeight',
  'DSLayout.feedHeroMaxHeight',
  'DSLayout.messageUnreadBadgeSize',
  'DSLayout.messageComposerHeight',
];
for (const reference of forbiddenReferences) {
  if (kotlinText.includes(reference)) {
    errors.push(`Android DS layer contains unresolved generated-token reference: ${reference}`);
  }
}

const invalidDpSyntax = kotlinText.match(/\b\d+(?:\.\d+)?dp\b/g) ?? [];
if (invalidDpSyntax.length > 0) {
  errors.push(`Android DS layer contains invalid Dp syntax: ${[...new Set(invalidDpSyntax)].join(', ')}`);
}

const requiredMarkers = [
  'typealias DSSizing = DesignTokens.Sizing',
  'typealias DSIconography = DesignTokens.Iconography',
  'object DflhDesignSystem',
  'val feedScreen = FeedScreenDsMap',
  'val feedTargetScreen = AndroidFeedTargetScreen',
  'val messagesScreen = MessagesScreenDsMap',
  'val messagesTargetScreen = AndroidMessagesTargetScreen',
  'val myPageScreen = MyPageScreenDsMap',
  'val myPageTargetScreen = AndroidMyPageTargetScreen',
  'object FeedScreenDsMap',
  'object MessagesScreenDsMap',
  'object MyPageScreenDsMap',
  'object FeedScreenTokenMap',
  'object MessagesScreenTokenMap',
  'object MyPageScreenTokenMap',
  'object AndroidFeedTargetScreen',
  'object AndroidMessagesTargetScreen',
  'object AndroidMyPageTargetScreen',
  'DSSizing.feedHeroHeightMin',
  'DSSizing.feedHeroHeightMax',
  'DSSizing.messageUnreadBadge',
  'DSSizing.messageComposerHeight',
  'DSSizing.touchTarget',
];
for (const marker of requiredMarkers) {
  if (!kotlinText.includes(marker)) {
    errors.push(`Android DS layer is missing required marker: ${marker}`);
  }
}

const generatedText = fs.existsSync(generatedPlatformTokens)
  ? fs.readFileSync(generatedPlatformTokens, 'utf8')
  : '';
for (const marker of ['object DesignTokens', 'object Sizing', 'object AnimationMs', 'source-version:']) {
  if (!generatedText.includes(marker)) {
    errors.push(`Generated Android token artifact missing marker: ${marker}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  androidRoot: path.relative(root, androidRoot),
  generatedPlatformTokens: path.relative(root, generatedPlatformTokens),
  copiedTokens: path.relative(root, copiedTokens),
  requiredFiles: requiredFiles.map((relativePath) => ({
    path: path.join(path.relative(root, androidRoot), relativePath),
    exists: fs.existsSync(path.join(androidRoot, relativePath)),
  })),
  checks: {
    generatedTokensFresh: fs.existsSync(generatedPlatformTokens)
      && fs.existsSync(copiedTokens)
      && fs.readFileSync(generatedPlatformTokens, 'utf8') === fs.readFileSync(copiedTokens, 'utf8'),
    invalidDpSyntaxCount: invalidDpSyntax.length,
    forbiddenReferenceCount: forbiddenReferences.filter((reference) => kotlinText.includes(reference)).length,
  },
  warnings,
  errors,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (errors.length > 0) {
  console.error('Android design-system verification failed:');
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log('Android design-system verification passed.');
