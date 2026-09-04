#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveSiblingRepository, siblingSkipMessage } from './sibling-repositories.mjs';

const root = process.cwd();
const iosRepository = resolveSiblingRepository(root, 'ios');
const androidRepository = resolveSiblingRepository(root, 'android');
const webRepository = resolveSiblingRepository(root, 'web');
const tokenPath = path.join(root, 'design-system', 'tokens', 'design-tokens.json');
const contractPath = path.join(root, 'design-system', 'contracts', 'component-contracts.json');

const generatedWeb = path.join(root, 'design-system', 'platform', 'web', 'design-tokens.css');
const generatedManifest = path.join(root, 'design-system', 'platform', 'manifest.json');
const generatedIos = path.join(root, 'design-system', 'platform', 'ios', 'DesignTokens.swift');
const generatedAndroid = path.join(root, 'design-system', 'platform', 'android', 'DesignTokens.kt');
const generatedContractDocs = path.join(root, 'design-system', 'contracts', 'COMPONENT_CONTRACTS.md');
const verificationReportPath = path.join(root, 'design-system', 'verification', 'reports', 'verify-design-system.json');
const iosCopy = path.join(iosRepository.path, 'Sources', 'App', 'DesignSystem', 'DesignTokens.swift');
const kotlinCopy = path.join(androidRepository.path, 'design-system', 'src', 'main', 'kotlin', 'com', 'dflh', 'designsystem', 'DesignTokens.kt');
const approvedIosImplementationDirs = [
  path.join(iosRepository.path, 'Sources', 'App', 'DesignSystem'),
];

const requiredContractSurfaceChecks = ['screen.feed', 'screen.messages', 'screen.myPage'];

const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const contracts = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const requiredContracts = [
  'app-shell',
  'card',
  'badge',
  'button',
  'navigation',
  'screen.feed',
  'screen.messages',
  'screen.myPage',
];
const requiredContractNames = new Set(requiredContracts);
const requiredSurfaces = new Set(Array.isArray(contracts.requiredSurfaces) ? contracts.requiredSurfaces : []);
const iosTokenPatterns = {
  DSColor: /\bDSColor\./,
  DSTextStyle: /\bDSTextStyle\./,
  DSSpace: /\bDSSpace\./,
  DSRadius: /\bDSRadius\./,
  DSCard: /\bDSCard\./,
  DSLayout: /\bDSLayout\./,
  DSLineWidth: /\bDSLineWidth\./,
  DSOpacity: /\bDSOpacity\./,
  DSFont: /\bDSFont\./,
  DSFontWeight: /\bDSFontWeight\./,
  DSAvatarColor: /\bDSAvatarColor\./,
  DSSizing: /\bDSSizing\./,
};
const webTokenPatterns = {
  DSColor: /\b(?:bg|text|border|ring|from|via|to|placeholder):?-[a-z0-9-]*(?:primary|surface|background|border|text|error|success|warning|warm|white|read|disabled|hero)[a-z0-9/-]*/i,
  DSTextStyle: /\b(?:text-(?:display|h1|h2|h3|title|body|body-sm|body-xs|caption|mini|xs|sm|xl)|font-(?:sans|serif|medium|semibold|bold))\b/,
  DSSpace: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy]|inset|top|bottom|left|right)-[0-9]\b/,
  DSSpacing: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy]|inset|top|bottom|left|right)-[0-9]\b/,
  DSRadius: /\brounded(?:-(?:sm|md|lg|xl|2xl|full))?\b/,
  DSCard: /\b(?:shadow|p|px|py|gap|space-y|rounded|bg-surface|border-border)-[a-z0-9-]*\b/,
  DSLayout: /\b(?:container|mx-auto|max-w|grid|flex|w|h|min-h|max-h|pb-20|safe|sticky|fixed|inset)-[a-z0-9-:[\]()%.]*\b/,
  DSLineWidth: /\bborder(?:-[trblxy])?(?:-[0-9])?\b/,
  DSOpacity: /\b(?:opacity|bg|border|text)-[a-z0-9-]+\/[0-9]+\b|\bopacity-[0-9]+\b/,
  DSFont: /\bfont-(?:sans|serif)\b/,
  DSFontWeight: /\bfont-(?:regular|medium|semibold|bold)\b/,
  DSAnimation: /\b(?:transition|duration|ease|animate|stagger)-[a-z0-9-]+\b/,
  DSIcon: /\b(?:size=|Icon|lucide-react|Mail|Send|Pin|Trash2)\b/,
  DSSizing: /\b(?:w|h|min-h|max-h)-[a-z0-9-:[\]()%.]*\b/,
};

const generatedWebText = fs.existsSync(generatedWeb) ? fs.readFileSync(generatedWeb, 'utf8') : '';
const generatedIosText = fs.existsSync(generatedIos) ? fs.readFileSync(generatedIos, 'utf8') : '';
const generatedAndroidText = fs.existsSync(generatedAndroid) ? fs.readFileSync(generatedAndroid, 'utf8') : '';
const iosCopyText = fs.existsSync(iosCopy) ? fs.readFileSync(iosCopy, 'utf8') : '';
const kotlinCopyText = fs.existsSync(kotlinCopy) ? fs.readFileSync(kotlinCopy, 'utf8') : '';

const requiredSections = [
  'colors',
  'typography',
  'spacing',
  'radius',
  'sizing',
  'elevation',
  'motion',
  'opacity',
  'layout',
  'iconography',
  'state',
  'platformMapping',
];
const errors = [];
const warnings = [];
const skipped = [
  ...(!iosRepository.exists ? [
    siblingSkipMessage(iosRepository, 'iOS token-copy verification'),
    siblingSkipMessage(iosRepository, 'iOS contract-evidence verification'),
  ] : []),
  ...(!androidRepository.exists ? [
    siblingSkipMessage(androidRepository, 'Kotlin token-copy verification'),
  ] : []),
  ...(!webRepository.exists ? [
    siblingSkipMessage(webRepository, 'web contract-evidence verification'),
  ] : []),
];

for (const skipMessage of skipped) {
  console.log(skipMessage);
}

if (typeof contracts.version !== 'string' || contracts.version.trim().length === 0) {
  errors.push('contracts.version is missing');
}

if (contracts.schema && typeof contracts.schema !== 'string') {
  warnings.push('contracts.schema should be a string for auditability');
}

if (!Array.isArray(contracts.violationRules) || contracts.violationRules.length === 0) {
  errors.push('contracts.violationRules must define explicit machine-detectable violation rules');
} else {
  for (const rule of contracts.violationRules) {
    if (!rule.id || !rule.severity || !Array.isArray(rule.appliesTo) || rule.appliesTo.length === 0) {
      errors.push(`Violation rule is incomplete: ${JSON.stringify(rule)}`);
    }
    const detection = rule.machineDetection;
    if (!detection || typeof detection !== 'object') {
      errors.push(`Violation rule ${rule.id} is missing machineDetection`);
    }
  }
}

if (!contracts.contractEvidenceRequirements || typeof contracts.contractEvidenceRequirements !== 'object') {
  errors.push('contracts.contractEvidenceRequirements is missing');
}

const mandatoryPrimitiveContracts = new Set(contracts.mandatoryPrimitiveContracts ?? []);
const mandatoryScreenContracts = new Set(contracts.mandatoryScreenContracts ?? []);
for (const contractName of ['app-shell', 'card', 'badge', 'button', 'navigation']) {
  if (!mandatoryPrimitiveContracts.has(contractName)) {
    errors.push(`contracts.mandatoryPrimitiveContracts is missing required primitive: ${contractName}`);
  }
}
for (const contractName of requiredContractSurfaceChecks) {
  if (!mandatoryScreenContracts.has(contractName)) {
    errors.push(`contracts.mandatoryScreenContracts is missing required screen: ${contractName}`);
  }
}

for (const section of requiredSections) {
  if (!(section in tokens)) {
    errors.push(`Missing token section: ${section}`);
  }
}

for (const requiredSurface of requiredContracts) {
  if (!requiredSurfaces.has(requiredSurface)) {
    errors.push(`contracts.requiredSurfaces is missing required surface: ${requiredSurface}`);
  }
}

  for (const contractName of requiredContracts) {
    const contract = contracts.components.find((c) => c.name === contractName);
  if (!contract) {
    errors.push(`Missing contract: ${contractName}`);
    continue;
  }
  if (!Array.isArray(contract.platforms) || contract.platforms.length === 0) {
    errors.push(`Contract ${contractName} is missing platform declarations`);
  }
  if (!Array.isArray(contract.tokens) && typeof contract.tokens !== 'object') {
    errors.push(`Contract ${contractName} must define token map`);
  }
  if (!Array.isArray(contract.states) || contract.states.length === 0) {
    errors.push(`Contract ${contractName} is missing state list`);
  }
  if (contract.mandatory !== true) {
    errors.push(`Contract ${contractName} must be marked mandatory`);
  }
  const expectedType = contractName.startsWith('screen.') ? 'screen' : 'primitive';
  if (contract.contractType !== expectedType) {
    errors.push(`Contract ${contractName} must declare contractType=${expectedType}`);
  }
    if (requiredContractNames.has(contractName) && (!contract.requiredTokenFamilies || contract.requiredTokenFamilies.length === 0)) {
      errors.push(`Contract ${contractName} is missing requiredTokenFamilies guidance`);
    }
    if (requiredContractNames.has(contractName) && !contract.requiredTokenUsage) {
      errors.push(`Contract ${contractName} is missing requiredTokenUsage guidance`);
    }
  }

const generatedFiles = [
  { label: 'web token css', path: generatedWeb },
  { label: 'ios platform token file', path: generatedIos },
  { label: 'android platform token file', path: generatedAndroid },
  { label: 'ios app token copy', path: iosCopy, repository: iosRepository },
  { label: 'android app token copy', path: kotlinCopy, repository: androidRepository },
  { label: 'generation manifest', path: generatedManifest },
  { label: 'generated contract documentation', path: generatedContractDocs },
];
for (const file of generatedFiles) {
  if (file.repository && !file.repository.exists) {
    continue;
  }
  if (!fs.existsSync(file.path)) {
    errors.push(`Missing generated artifact: ${file.label} (${file.path})`);
  }
}

  if (fs.existsSync(generatedManifest)) {
    const manifest = JSON.parse(fs.readFileSync(generatedManifest, 'utf8'));
  if (manifest.version !== tokens.version) {
    errors.push(`Manifest version (${manifest.version}) does not match token version (${tokens.version})`);
  }
  if (manifest.sourceOfTruth !== tokens.sourceOfTruth) {
    errors.push('Manifest sourceOfTruth does not match design-tokens.json');
  }
  if (!manifest.generatedAt) {
    errors.push('Manifest is missing generatedAt');
  }
  if (!manifest.generatedBy && !manifest.generator?.name) {
    errors.push('Manifest is missing generator marker');
  }
  if (!manifest.tokenDigest) {
    errors.push('Manifest is missing tokenDigest');
  }
  const expectedFiles = [
    generatedWeb,
    generatedIos,
    generatedAndroid,
    ...(iosRepository.exists ? [iosCopy] : []),
    ...(androidRepository.exists ? [kotlinCopy] : []),
  ];
  for (const file of expectedFiles) {
    const relativePath = path.relative(root, file);
    const expectedDigest = manifestFileDigest(manifest, file);
    if (!expectedDigest) {
      errors.push(`Manifest is missing fileDigest for ${relativePath}`);
      continue;
    }
    if (!fs.existsSync(file)) {
      continue;
    }
    const actualDigest = crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex');
    if (actualDigest !== expectedDigest) {
      errors.push(`Manifest hash mismatch for ${relativePath}`);
    }
  }

  if (!manifest.files || typeof manifest.files !== 'object') {
    errors.push('Manifest is missing files map');
  } else {
    const requiredFiles = [
      ['web', generatedWeb],
      ['ios', generatedIos],
      ['android', generatedAndroid],
      ...(iosRepository.exists ? [['iosCopy', iosCopy]] : []),
      ...(androidRepository.exists ? [['kotlinCopy', kotlinCopy]] : []),
    ];
    for (const [label, filePath] of requiredFiles) {
      const manifestRef = manifestRefFromRelativePath(manifest, path.relative(root, filePath));
      if (!manifestRef) {
        errors.push(`Manifest files section is missing ref for ${label}`);
      }
    }
  }
}

const manifestDigest = fs.existsSync(tokenPath)
  ? crypto.createHash('sha256').update(fs.readFileSync(tokenPath, 'utf8')).digest('hex')
  : '';

if (generatedWebText) {
  if (!generatedWebText.includes('--color-primary')) {
    errors.push('Web tokens missing color-primary variable');
  }
  if (!generatedWebText.includes('--radius-xl')) {
    errors.push('Web tokens missing radius-xl variable');
  }
  if (!generatedWebText.includes('--icon-size-md')) {
    errors.push('Web tokens missing icon-size-md variable');
  }
  if (!generatedWebText.includes('source-version:')) {
    errors.push('Web token file missing version header');
  }
}

if (generatedIosText) {
  if (!generatedIosText.includes('public enum DSColor')) {
    errors.push('iOS token file missing DSColor enum');
  }
  if (!generatedIosText.includes('public enum DSSpacing')) {
    errors.push('iOS token file missing DSSpacing enum');
  }
  if (!generatedIosText.includes('public enum DSOpacity')) {
    errors.push('iOS token file missing DSOpacity enum');
  }
  if (!generatedIosText.includes('public enum DSLayout')) {
    errors.push('iOS token file missing DSLayout enum');
  }
  if (!generatedIosText.includes('// source-version:')) {
    errors.push('iOS token file missing version header');
  }
}

if (generatedAndroidText) {
  if (!generatedAndroidText.includes('object DesignTokens')) {
    errors.push('Android token file missing DesignTokens object');
  }
  if (!generatedAndroidText.includes('object Sizing')) {
    errors.push('Android token file missing Sizing object');
  }
  if (!generatedAndroidText.includes('object AnimationMs')) {
    errors.push('Android token file missing AnimationMs object');
  }
  if (!generatedAndroidText.includes('// source-version:')) {
    errors.push('Android token file missing version header');
  }
}

if (iosRepository.exists && generatedIosText && iosCopyText) {
  if (generatedIosText !== iosCopyText) {
    errors.push('Swift token copy is out-of-sync with generated platform/iOS token source. Run generator and copy output into app.');
  }
}

if (androidRepository.exists && generatedAndroidText && kotlinCopyText) {
  if (generatedAndroidText !== kotlinCopyText) {
    errors.push('Kotlin token copy is out-of-sync with generated platform/Android token source. Run generator and copy output into app.');
  }
}

function readEvidenceText(contractName, platform, evidenceFiles) {
  if (!Array.isArray(evidenceFiles) || evidenceFiles.length === 0) {
    errors.push(`Contract ${contractName} is missing implementationEvidence.${platform}`);
    return { text: '', files: [], hasFiles: false };
  }

  const contractTextParts = [];
  const files = [];
  let hasFiles = false;

  for (const relativeFile of evidenceFiles) {
    const file = resolveEvidencePath(platform, relativeFile);
    if (!fs.existsSync(file)) {
      errors.push(`Missing implementation evidence file for ${contractName}: ${path.relative(root, file)}`);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    hasFiles = true;
    files.push({
      relativePath: path.relative(root, file),
      absolutePath: file,
      text,
    });
    contractTextParts.push(text);
  }

  return {
    text: contractTextParts.join('\n'),
    files,
    hasFiles,
  };
}

function checkContractEvidenceTokenUsage(contractName, evidence, requiredTokenFamilies, platform) {
  const requiredTokenKeys = Array.isArray(requiredTokenFamilies) ? requiredTokenFamilies : [];
  const contractText = evidence.text;
  for (const tokenKey of requiredTokenKeys) {
    const tokenPattern = platform === 'web' ? webTokenPatterns[tokenKey] : iosTokenPatterns[tokenKey];
    if (tokenPattern && !tokenPattern.test(contractText)) {
      const evidenceFiles = evidence.files.map((file) => file.relativePath).join(', ');
      errors.push(`Contract ${contractName} requires ${tokenKey} usage in ${platform} implementation files (${evidenceFiles}).`);
    }
  }
}

function checkContractTokenRules(contractName, evidence) {
  const forbiddenColorPatterns = [
    '.foregroundStyle(.secondary)',
    '.foregroundStyle(.tertiary)',
    '.foregroundStyle(.primary)',
    '.background(.secondary)',
    '.background(.primary)',
    '.background(.black)',
    '.foregroundColor(.primary)',
    '.foregroundColor(.secondary)',
    '.foregroundColor(.tertiary)',
    '.tint(.primary)',
    '.accentColor(.blue)',
  ];
  for (const pattern of forbiddenColorPatterns) {
    reportTextOccurrences({
      contractName,
      platform: 'ios',
      ruleId: 'raw-color-literal',
      evidence,
      needle: pattern,
      message: 'Found non-DS tokenized style usage',
    });
  }

  const fontPatterns = ['.font(.headline)', '.font(.subheadline)', '.font(.caption)', '.font(.caption2)', '.font(.body)', '.font(.title3)', '.font(.title2)', '.font(.title)', '.font(.callout)', '.font(.footnote)'];
  for (const pattern of fontPatterns) {
    reportTextOccurrences({
      contractName,
      platform: 'ios',
      ruleId: 'raw-typography',
      evidence,
      needle: pattern,
      message: 'Found direct semantic font',
    });
  }

  const directCornerPatterns = ['.cornerRadius(4)', '.cornerRadius(8)', '.cornerRadius(12)', '.cornerRadius(14)', '.cornerRadius(16)', '.cornerRadius(18)', '.cornerRadius(20)'];
  for (const pattern of directCornerPatterns) {
    reportTextOccurrences({
      contractName,
      platform: 'ios',
      ruleId: 'raw-spacing-or-sizing-scalar',
      evidence,
      needle: pattern,
      message: 'Potential hard-coded corner radius',
    });
  }

  const spacingPatterns = [
    /\.padding\(\s*\)/g,
    /\.(?:padding|frame)\([^)]*(?<![A-Za-z])(?:\d+)(?:\.\d+)?(?![A-Za-z])/g,
    /\.cornerRadius\([^)]*\d[^)]*\)/g,
    /\.font\(\s*\.system\(/g,
    /\.opacity\((0(?:\.\d+)?|1(?:\.0+)?)\)/g,
  ];
  for (const pattern of spacingPatterns) {
    reportRegexOccurrences({
      contractName,
      platform: 'ios',
      ruleId: 'raw-spacing-or-sizing-scalar',
      evidence,
      pattern,
      message: 'Potential hard-coded style scalar',
    });
  }

  const materialPatterns = [
    /\.background\(\s*\.(?:ultraThinMaterial|thinMaterial|regularMaterial|thickMaterial|ultraThickMaterial)/g,
    /\.fill\(\s*\.(?:ultraThinMaterial|thinMaterial|regularMaterial|thickMaterial|ultraThickMaterial)\s*\)/g,
  ];
  for (const pattern of materialPatterns) {
    reportRegexOccurrences({
      contractName,
      platform: 'ios',
      ruleId: 'raw-color-literal',
      evidence,
      pattern,
      message: 'Found non-tokenized SwiftUI material usage',
    });
  }
}

function checkWebContractTokenRules(contractName, evidence) {
  const violationPatterns = [
    { id: 'raw-color-literal', pattern: /#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/g },
    { id: 'raw-typography', pattern: /\b(?:text|font)-\[[^\]]+\]/g },
    {
      id: 'raw-spacing-or-sizing-scalar',
      pattern: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy]|rounded|w|h|min-h|max-h|max-w|inset|top|bottom|left|right)-\[[^\]]+\]|style=\{\{[^}]+(?:width|height|minHeight|maxHeight|padding|margin|borderRadius|opacity)/g,
    },
  ];

  for (const { id, pattern } of violationPatterns) {
    reportRegexOccurrences({
      contractName,
      platform: 'web',
      ruleId: id,
      evidence,
      pattern,
      message: 'Contract evidence contains a hardcoded design literal',
      shouldIgnore: (match) => match.includes('var(--'),
    });
  }
}

function reportTextOccurrences({ contractName, platform, ruleId, evidence, needle, message }) {
  for (const file of evidence.files) {
    if (platform === 'ios' && isApprovedIosImplementationFile(file.absolutePath)) {
      continue;
    }
    let searchFrom = 0;
    while (searchFrom < file.text.length) {
      const index = file.text.indexOf(needle, searchFrom);
      if (index === -1) {
        break;
      }
      const location = getLocation(file.text, index);
      errors.push(`${message}: ${contractName} ${platform} ${ruleId} ${file.relativePath}:${location.line}:${location.column} -> ${needle}`);
      searchFrom = index + needle.length;
    }
  }
}

function reportRegexOccurrences({ contractName, platform, ruleId, evidence, pattern, message, shouldIgnore = () => false }) {
  for (const file of evidence.files) {
    if (platform === 'ios' && isApprovedIosImplementationFile(file.absolutePath)) {
      continue;
    }
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const match of file.text.matchAll(regex)) {
      const value = match[0];
      if (shouldIgnore(value)) {
        continue;
      }
      const location = getLocation(file.text, match.index ?? 0);
      errors.push(`${message}: ${contractName} ${platform} ${ruleId} ${file.relativePath}:${location.line}:${location.column} -> ${value}`);
    }
  }
}

function isApprovedIosImplementationFile(filePath) {
  return approvedIosImplementationDirs.some((dir) => filePath.startsWith(`${dir}${path.sep}`));
}

function getLocation(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const lastNewline = before.lastIndexOf('\n');
  const column = index - lastNewline;
  return { line, column };
}

function checkGeneratedContractDocs() {
  if (!fs.existsSync(generatedContractDocs)) {
    return;
  }
  const docs = fs.readFileSync(generatedContractDocs, 'utf8');
  const requiredDocMarkers = [
    '# Design System Component Contracts',
    '## Mandatory Surfaces',
    '## Violation Rules',
    '## Evidence Requirements',
    '## Contract Matrix',
  ];
  for (const marker of requiredDocMarkers) {
    if (!docs.includes(marker)) {
      errors.push(`Generated contract documentation is missing section: ${marker}`);
    }
  }
  for (const contractName of requiredContracts) {
    if (!docs.includes(`\`${contractName}\``)) {
      errors.push(`Generated contract documentation is missing contract: ${contractName}`);
    }
  }
}

for (const contractName of requiredContractSurfaceChecks) {
  const contract = contracts.components.find((c) => c.name === contractName);
  if (!contract) {
    continue;
  }

  const contractEvidence = contract.implementationEvidence;
  if (!contractEvidence || typeof contractEvidence !== 'object') {
    errors.push(`Contract ${contractName} is missing implementationEvidence`);
    continue;
  }

  const iosEvidence = iosRepository.exists
    ? readEvidenceText(contractName, 'ios', contractEvidence.ios)
    : { text: '', files: [], hasFiles: false };
  const webEvidence = webRepository.exists
    ? readEvidenceText(contractName, 'web', contractEvidence.web)
    : { text: '', files: [], hasFiles: false };

  if (iosEvidence.hasFiles) {
    reportRegexOccurrences({
      contractName,
      platform: 'ios',
      ruleId: 'raw-color-literal',
      evidence: iosEvidence,
      pattern: /#(?:[0-9a-fA-F]{3,8})/g,
      message: 'Hard-coded hex literal found',
    });
    checkContractEvidenceTokenUsage(contractName, iosEvidence, contract.requiredTokenFamilies, 'iOS');
    checkContractTokenRules(contractName, iosEvidence);
    if (contract.requiredTokenUsage) {
      for (const tokenRef of Object.values(contract.requiredTokenUsage).flat()) {
        if (typeof tokenRef === 'string' && tokenRef.length > 0 && !iosEvidence.text.includes(tokenRef)) {
          const evidenceFiles = iosEvidence.files.map((file) => file.relativePath).join(', ');
          errors.push(`Contract ${contractName} requires token usage '${tokenRef}' across iOS implementation files (${evidenceFiles}).`);
        }
      }
    }
  }

  if (webEvidence.hasFiles) {
    checkContractEvidenceTokenUsage(contractName, webEvidence, contract.requiredTokenFamilies, 'web');
    checkWebContractTokenRules(contractName, webEvidence);
  }

  const hasStateCoverage = contractName === 'screen.messages'
    ? /sending|loading|empty|error|data/.test(contract.states.join(' '))
    : true;
  if (!hasStateCoverage) {
    errors.push(`Contract ${contractName} has insufficient state coverage for iOS mapping.`);
  }
}

checkGeneratedContractDocs();

if (manifestDigest && fs.existsSync(generatedManifest)) {
  const manifest = JSON.parse(fs.readFileSync(generatedManifest, 'utf8'));
  if (manifest.tokenDigest !== manifestDigest) {
    errors.push('Manifest tokenDigest does not match current design-tokens.json');
  }
  const requiredKeys = [
    'web',
    'ios',
    'android',
    ...(iosRepository.exists ? ['iosCopy'] : []),
    ...(androidRepository.exists ? ['kotlinCopy'] : []),
  ];
  for (const key of requiredKeys) {
    if (!manifest.files || !manifest.files[key]) {
      errors.push(`Manifest files section is missing ${key}`);
    }
  }
}

const summary = {
  timestamp: new Date().toISOString(),
  tokensVersion: tokens.version,
  sourceOfTruth: tokens.sourceOfTruth,
  tokenSectionCount: Object.keys(tokens).length,
  contractsCount: contracts.components.length,
  requiredContractCount: requiredContracts.length,
  hasRequiredContracts: requiredContracts.reduce((acc, name) => {
    acc[name] = contracts.components.some((c) => c.name === name);
    return acc;
  }, {}),
  generatedFiles: generatedFiles.map((f) => ({
    label: f.label,
    exists: fs.existsSync(f.path),
    ...(f.repository && !f.repository.exists ? { skipped: true } : {}),
  })),
  tokenStates: tokens.state?.states ?? [],
  contractStates: [...new Set(contracts.components.flatMap((c) => c.states || []))],
  warnings,
  errors,
  ...(skipped.length > 0 ? { skipped } : {}),
};

console.log(JSON.stringify(summary, null, 2));
fs.mkdirSync(path.dirname(verificationReportPath), { recursive: true });
fs.writeFileSync(verificationReportPath, `${JSON.stringify(summary, null, 2)}\n`);

if (errors.length > 0) {
  console.error('Verification failed:');
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('Verification completed with warnings:');
  for (const warning of warnings) {
    console.warn(` - ${warning}`);
  }
}

if (skipped.length > 0) {
  console.log('Verification completed for present repositories; skipped checks were not verified.');
} else {
  console.log('Verification passed.');
}

function manifestFileDigest(manifest, filePath) {
  const relativePath = path.relative(root, filePath);
  return (
    manifest?.fileDigests?.[relativePath]
    || manifest?.fileDigests?.[path.resolve(root, relativePath)]
  );
}

function manifestRefFromRelativePath(manifest, relativePath) {
  if (!manifest?.files) {
    return null;
  }

  const normalizedTarget = path.normalize(relativePath);
  const absoluteTarget = path.resolve(root, normalizedTarget);
  for (const value of Object.values(manifest.files)) {
    const normalizedValue = path.normalize(value);
    const absoluteValue = path.resolve(root, value);
    if (normalizedValue === normalizedTarget || absoluteValue === absoluteTarget) {
      return value;
    }
  }
  return null;
}

function resolveEvidencePath(platform, evidencePath) {
  if (path.isAbsolute(evidencePath)) {
    return evidencePath;
  }

  const repository = platform === 'ios' ? iosRepository : webRepository;
  const normalizedPath = path.normalize(evidencePath);
  const repositoryPrefix = `${repository.defaultDirectory}${path.sep}`;
  if (normalizedPath.startsWith(repositoryPrefix)) {
    return path.join(repository.path, normalizedPath.slice(repositoryPrefix.length));
  }
  return path.join(root, normalizedPath);
}
