import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: { 'parser/index': 'src/parser/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
  },
]);
