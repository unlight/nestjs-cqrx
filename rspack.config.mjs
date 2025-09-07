export default {
  $schema: 'https://swc.rs/schema.json',
  sourceMaps: false,
  module: {
    type: 'commonjs',
    strict: true,
    strictMode: true,
    lazy: false,
    noInterop: false,
  },
  jsc: {
    keepClassNames: true,
    loose: true,
    externalHelpers: true,
    target: 'es2022',
    parser: {
      syntax: 'typescript',
      tsx: false,
      dynamicImport: true,
      decorators: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
    baseUrl: './',
  },
  minify: false,
};
