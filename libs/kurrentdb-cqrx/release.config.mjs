import config from '../../release.config.mjs';

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  tagFormat: 'kurrentdb-cqrx-v${version}',
  ...config,
  plugins: [
    [
      'semantic-release-scope-filter',
      {
        scopes: ['kurrentdb'],
        filterOutMissingScope: false,
      },
    ],
    ...config.plugins,
  ],
};
