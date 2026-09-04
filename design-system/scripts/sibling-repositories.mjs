import fs from 'node:fs';
import path from 'node:path';

const REPOSITORIES = {
  android: {
    name: 'Kotlin',
    envVar: 'DFLH_KOTLIN_REPO',
    defaultDirectory: 'dflh-saf-v2-kotlin',
  },
  ios: {
    name: 'iOS',
    envVar: 'DFLH_SWIFT_REPO',
    defaultDirectory: 'dflh-saf-v2-swift',
  },
  web: {
    name: 'web',
    envVar: 'DFLH_WEB_REPO',
    defaultDirectory: 'dflh-saf-v2',
  },
};

export function resolveSiblingRepository(root, repository) {
  const config = REPOSITORIES[repository];
  if (!config) {
    throw new Error(`Unknown sibling repository: ${repository}`);
  }

  const configuredPath = process.env[config.envVar]?.trim();
  const repoPath = path.resolve(root, configuredPath || config.defaultDirectory);

  return {
    ...config,
    path: repoPath,
    exists: fs.existsSync(repoPath),
    configuredBy: configuredPath ? config.envVar : 'default',
  };
}

export function siblingSkipMessage(repository, work) {
  const missingPath = repository.configuredBy === 'default'
    ? repository.defaultDirectory
    : repository.path;
  return `skipping ${work}: ${missingPath} not found (set ${repository.envVar} to enable)`;
}
