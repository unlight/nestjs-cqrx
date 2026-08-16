import { defineConfig } from 'tsdown'

// Relative `entry`/`outDir` resolve from the package cwd tsdown is invoked from,
// not from this file's directory (tsdown keeps cwd = process.cwd()).
export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'node',
  dts: true,
  clean: true,
  format: ['esm'],
  outDir: 'dist',
  fixedExtension: false,
})
