#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveSiblingRepository, siblingSkipMessage } from './sibling-repositories.mjs';

const root = process.cwd();
const iosRepository = resolveSiblingRepository(root, 'ios');
const iosSourceRoot = path.join(iosRepository.path, 'Sources', 'App');
const generatedTokenFile = path.join(root, 'design-system', 'platform', 'ios', 'DesignTokens.swift');
const appTokenFile = path.join(iosSourceRoot, 'DesignSystem', 'DesignTokens.swift');
const contractPath = path.join(root, 'design-system', 'contracts', 'component-contracts.json');
const exceptionPath = path.join(root, 'design-system', 'verification', 'ios-design-system-exceptions.json');
const reportPath = path.join(root, 'design-system', 'verification', 'reports', 'ios-design-system-compliance.json');

const approvedImplementationDirs = [
  path.join(iosSourceRoot, 'DesignSystem'),
];

const generatedTokenFiles = [
  generatedTokenFile,
  appTokenFile,
];

const productionScreenNamePattern = /(View|Screen)\.swift$/;
const excludedNamePatterns = [
  /Preview/i,
  /Mock/i,
  /Test/i,
];

if (!iosRepository.exists) {
  const skipMessage = siblingSkipMessage(iosRepository, 'iOS design-system compliance verification');
  const report = {
    generatedAt: new Date().toISOString(),
    iosSourceRoot: path.relative(root, iosSourceRoot),
    approvedImplementationPaths: [],
    generatedTokenFiles: [path.relative(root, generatedTokenFile)],
    documentedExceptionFile: path.relative(root, exceptionPath),
    documentedExceptions: [],
    scannedProductionUIFiles: [],
    scannedProductionScreens: [],
    iosContractEvidenceFiles: [],
    missingScreenEvidence: [],
    checkedCategories: [],
    violationCount: 0,
    violations: [],
    skipped: [skipMessage],
  };
  console.log(skipMessage);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const forbiddenChecks = [
  {
    category: 'color',
    reason: 'Hardcoded SwiftUI color constructor; use DSColor tokens or DS components.',
    pattern: /\bColor\s*\(/g,
  },
  {
    category: 'color',
    reason: 'Hardcoded UIKit color constructor; use DSColor tokens or DS components.',
    pattern: /\bUIColor\s*\(/g,
  },
  {
    category: 'color',
    reason: 'Hardcoded UIKit color value; use DSColor tokens or DS components.',
    pattern: /\bUIColor\.(?!clear\b)[A-Za-z_]\w*/g,
  },
  {
    category: 'color',
    reason: 'Hardcoded SwiftUI color value; use DSColor tokens or DS components.',
    pattern: /\bColor\.(?!clear\b|accentColor\b)[A-Za-z_]\w*/g,
  },
  {
    category: 'color',
    reason: 'Hardcoded hex color literal; use DSColor tokens.',
    pattern: /#[0-9A-Fa-f]{3,8}\b/g,
  },
  {
    category: 'font',
    reason: 'Hardcoded font constructor; use DSTextStyle or DSText.',
    pattern: /\bFont\.(?:system|custom)\s*\(/g,
  },
  {
    category: 'font',
    reason: 'Hardcoded UIKit font constructor; use DSTextStyle or DS components.',
    pattern: /\bUIFont\.(?:systemFont|boldSystemFont|italicSystemFont|monospacedSystemFont|preferredFont)\s*\(/g,
  },
  {
    category: 'font',
    reason: 'Hardcoded SwiftUI font style; use DSTextStyle or DSText.',
    pattern: /\.font\s*\(\s*\.(?!body\b)[A-Za-z_]\w*/g,
  },
  {
    category: 'spacing',
    reason: 'Hardcoded stack spacing; use DSSpace, DSCard, or DSLayout tokens.',
    pattern: /\b(?:VStack|HStack|LazyVStack|LazyHStack|Grid|LazyVGrid|LazyHGrid)\s*\([^)]*\bspacing\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'spacing',
    reason: 'Hardcoded padding value; use DSSpace, DSCard, or DSLayout tokens.',
    pattern: /\.padding\s*\((?:\s*\.[A-Za-z_]\w+\s*,)?\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'spacing',
    reason: 'Hardcoded spacer length; use DSSpace, DSCard, or DSLayout tokens.',
    pattern: /\bSpacer\s*\([^)]*\bminLength\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'radius',
    reason: 'Hardcoded corner radius; use DSRadius, DSCard, or DSLayout tokens.',
    pattern: /\.(?:cornerRadius)\s*\(\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'radius',
    reason: 'Hardcoded shape corner radius; use DSRadius, DSCard, or DSLayout tokens.',
    pattern: /\b(?:RoundedRectangle|UnevenRoundedRectangle)\s*\([^)]*\bcornerRadius\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'shadow',
    reason: 'Hardcoded shadow literal; use DSElevation tokens or DS components.',
    pattern: /\.shadow\s*\([^)]*(?:\bradius\s*:\s*-?\d+(?:\.\d+)?|\bx\s*:\s*-?\d+(?:\.\d+)?|\by\s*:\s*-?\d+(?:\.\d+)?)/g,
  },
  {
    category: 'animation',
    reason: 'Hardcoded animation duration; use DSAnimation tokens.',
    pattern: /\.(?:animation|easeIn|easeOut|easeInOut|linear|spring|interpolatingSpring)\s*\([^)]*\bduration\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'animation',
    reason: 'Hardcoded animation duration; use DSAnimation tokens.',
    pattern: /\bwithAnimation\s*\([^)]*\bduration\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'layout',
    reason: 'Hardcoded frame dimension; use DSSizing, DSLayout, DSSpace, or component tokens.',
    pattern: /\.frame\s*\([^)]*\b(?:width|height|minWidth|minHeight|maxWidth|maxHeight)\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'layout',
    reason: 'Hardcoded offset or position; use DSSizing, DSLayout, DSSpace, or component tokens.',
    pattern: /\.(?:offset|position)\s*\([^)]*\b(?:x|y)\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'layout',
    reason: 'Hardcoded safe-area inset spacing; use DSSpace, DSCard, or DSLayout tokens.',
    pattern: /\.safeAreaInset\s*\([^)]*\bspacing\s*:\s*-?\d+(?:\.\d+)?/g,
  },
  {
    category: 'layout',
    reason: 'Hardcoded UIKit layout constant; use DSSizing, DSLayout, DSSpace, or component tokens.',
    pattern: /\.(?:constant|cornerRadius|borderWidth)\s*=\s*-?\d+(?:\.\d+)?/g,
  },
];

function isApprovedPath(filePath) {
  return approvedImplementationDirs.some((dir) => filePath.startsWith(`${dir}${path.sep}`))
    || generatedTokenFiles.includes(filePath);
}

function listSwiftFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSwiftFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.swift') ? [entryPath] : [];
  });
}

function isProductionSwiftUIScreen(filePath, source) {
  const basename = path.basename(filePath);
  if (!productionScreenNamePattern.test(basename)) return false;
  if (excludedNamePatterns.some((pattern) => pattern.test(basename))) return false;
  return /\bimport\s+SwiftUI\b/.test(source) && /\bstruct\s+\w+\s*:\s*View\b/.test(source);
}

function isProductionUIKitOrSwiftUIFile(filePath, source) {
  const basename = path.basename(filePath);
  if (!basename.endsWith('.swift')) return false;
  if (excludedNamePatterns.some((pattern) => pattern.test(basename))) return false;
  return /\bimport\s+(SwiftUI|UIKit)\b/.test(source);
}

function readContracts() {
  if (!fs.existsSync(contractPath)) {
    return { components: [] };
  }
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function readDocumentedExceptions() {
  if (!fs.existsSync(exceptionPath)) {
    return [];
  }
  const exceptions = JSON.parse(fs.readFileSync(exceptionPath, 'utf8'));
  return Array.isArray(exceptions.approvedExceptions) ? exceptions.approvedExceptions : [];
}

function resolveIosRepositoryPath(repositoryPath) {
  if (path.isAbsolute(repositoryPath)) {
    return repositoryPath;
  }

  const normalizedPath = path.normalize(repositoryPath);
  const repositoryPrefix = `${iosRepository.defaultDirectory}${path.sep}`;
  if (normalizedPath.startsWith(repositoryPrefix)) {
    return path.join(iosRepository.path, normalizedPath.slice(repositoryPrefix.length));
  }
  return path.join(root, normalizedPath);
}

function collectIosEvidenceFiles(contracts) {
  const evidenceFiles = new Set();
  for (const contract of contracts.components ?? []) {
    const iosEvidence = contract.implementationEvidence?.ios;
    if (!Array.isArray(iosEvidence)) continue;
    for (const evidencePath of iosEvidence) {
      const absolutePath = resolveIosRepositoryPath(evidencePath);
      evidenceFiles.add(path.normalize(path.relative(root, absolutePath)));
    }
  }
  return evidenceFiles;
}

function lineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

function positionForIndex(starts, index) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (starts[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const lineIndex = Math.max(0, high);
  return {
    line: lineIndex + 1,
    column: index - starts[lineIndex] + 1,
  };
}

function lineTextAt(source, starts, line) {
  const start = starts[line - 1] ?? 0;
  const nextStart = starts[line] ?? source.length + 1;
  return source.slice(start, nextStart).trim();
}

const contracts = readContracts();
const documentedExceptions = readDocumentedExceptions();
const iosEvidenceFiles = collectIosEvidenceFiles(contracts);
const documentedScreenEvidenceExceptions = new Map(
  documentedExceptions
    .filter((exception) => exception?.type === 'screen-contract-evidence' && exception.path && exception.reason)
    .map((exception) => [
      path.normalize(path.relative(root, resolveIosRepositoryPath(exception.path))),
      exception,
    ])
);

const swiftFiles = listSwiftFiles(iosSourceRoot);
const productionUIFiles = [];
const productionScreens = [];
const missingScreenEvidence = [];
const violations = [];

for (const filePath of swiftFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(root, filePath);
  const normalizedRelativePath = path.normalize(relativePath);
  const approved = isApprovedPath(filePath);
  const isProductionUI = isProductionUIKitOrSwiftUIFile(filePath, source);
  const isProductionScreen = isProductionSwiftUIScreen(filePath, source);

  if (isProductionUI) {
    productionUIFiles.push(relativePath);
  }

  if (isProductionScreen) {
    productionScreens.push(relativePath);
    const hasContractEvidence = iosEvidenceFiles.has(normalizedRelativePath);
    const hasDocumentedException = documentedScreenEvidenceExceptions.has(normalizedRelativePath);
    if (!hasContractEvidence && !hasDocumentedException) {
      missingScreenEvidence.push({
        path: relativePath,
        reason: 'Production screen is not listed in any design-system contract implementationEvidence.ios entry.',
      });
    }
  }

  if (approved || !isProductionUI) {
    continue;
  }

  const starts = lineStarts(source);

  for (const check of forbiddenChecks) {
    check.pattern.lastIndex = 0;
    for (const match of source.matchAll(check.pattern)) {
      const index = match.index ?? 0;
      const position = positionForIndex(starts, index);
      violations.push({
        path: relativePath,
        line: position.line,
        column: position.column,
        category: check.category,
        reason: check.reason,
        snippet: lineTextAt(source, starts, position.line),
      });
    }
  }
}

violations.sort((a, b) => (
  a.path.localeCompare(b.path)
  || a.line - b.line
  || a.column - b.column
  || a.category.localeCompare(b.category)
));

const report = {
  generatedAt: new Date().toISOString(),
  iosSourceRoot: path.relative(root, iosSourceRoot),
  approvedImplementationPaths: approvedImplementationDirs.map((dir) => path.relative(root, dir)),
  generatedTokenFiles: generatedTokenFiles.map((filePath) => path.relative(root, filePath)),
  documentedExceptionFile: path.relative(root, exceptionPath),
  documentedExceptions,
  scannedProductionUIFiles: productionUIFiles.sort(),
  scannedProductionScreens: productionScreens.sort(),
  iosContractEvidenceFiles: [...iosEvidenceFiles].sort(),
  missingScreenEvidence,
  checkedCategories: [...new Set(forbiddenChecks.map((check) => check.category))].sort(),
  violationCount: violations.length + missingScreenEvidence.length,
  violations,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (missingScreenEvidence.length > 0 || violations.length > 0) {
  console.error('iOS design-system compliance verification failed:');
  for (const missing of missingScreenEvidence) {
    console.error(` - ${missing.path} [missing-contract-evidence] ${missing.reason}`);
  }
  for (const violation of violations) {
    console.error(` - ${violation.path}:${violation.line}:${violation.column} [${violation.category}] ${violation.reason}`);
  }
  process.exit(1);
}

console.log('iOS design-system compliance verification passed.');
