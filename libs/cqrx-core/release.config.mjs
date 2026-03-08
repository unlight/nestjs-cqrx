import config from '../../release.config.mjs';

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  tagFormat: 'cqrx-core-v${version}',
  ...config,
  plugins: [
    [
      'semantic-release-scope-filter',
      {
        scopes: ['core'],
        filterOutMissingScope: false,
      },
    ],
    ...config.plugins,
  ],
};
