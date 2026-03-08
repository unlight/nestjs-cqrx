import config from '../../release.config.mjs';

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  tagFormat: 'nestjs-cqrx-v${version}',
  ...config,
  plugins: [
    [
      'semantic-release-scope-filter',
      {
        scopes: ['nestjs'],
        filterOutMissingScope: false,
      },
    ],
    ...config.plugins,
  ],
};
