import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    passWithNoTests: true,
  },
  plugins: [
    // This enables SWC to handle the transformation
    swc.vite({
      // Explicitly enable legacy decorators if not picked up from tsconfig
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
