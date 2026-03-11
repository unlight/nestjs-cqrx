import config from '../../release.config.mjs';

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  tagFormat: 'eventdbx-cqrx-v${version}',
  ...config,
  plugins: [
    [
      'semantic-release-scope-filter',
      {
        scopes: ['eventdbx'],
        filterOutMissingScope: false,
      },
    ],
    ...config.plugins,
  ],
};
