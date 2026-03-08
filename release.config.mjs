/**
 * @type {import('semantic-release').GlobalConfig}
 */

export default {
  extends: ['semantic-release-commit-filter'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        pkgRoot: './dist',
      },
    ],
    '@semantic-release/github',
    '@semantic-release/git',
  ],
};
