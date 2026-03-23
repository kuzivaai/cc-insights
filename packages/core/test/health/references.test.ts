import { describe, it, expect } from 'vitest';
import { extractFileReferences, extractCommandReferences } from '../../src/health/references.js';

describe('extractFileReferences', () => {
  it('extracts backtick-wrapped file paths with line numbers', () => {
    const content = `# Files\n\nSee \`src/App.tsx\` for the main component.\nAlso check \`server.js\` for the API.`;
    const refs = extractFileReferences(content);

    expect(refs).toContainEqual(expect.objectContaining({ reference: 'src/App.tsx', line: 3 }));
    expect(refs).toContainEqual(expect.objectContaining({ reference: 'server.js', line: 4 }));
  });

  it('extracts code block file paths', () => {
    const content = `## Structure\n\n\`\`\`\nsrc/index.ts    Entry point\nlib/utils.ts    Helpers\n\`\`\``;
    const refs = extractFileReferences(content);

    expect(refs.some(r => r.reference === 'src/index.ts')).toBe(true);
    expect(refs.some(r => r.reference === 'lib/utils.ts')).toBe(true);
  });

  it('filters out URLs and version numbers', () => {
    const content = 'See `https://example.com/foo.ts` and version `2.0.1`';
    const refs = extractFileReferences(content);

    expect(refs).toHaveLength(0);
  });

  it('handles duplicate references — returns each occurrence with its line', () => {
    const content = 'Line one `src/foo.ts`\nLine two\nLine three `src/foo.ts`';
    const refs = extractFileReferences(content);

    expect(refs).toHaveLength(2);
    expect(refs[0].line).toBe(1);
    expect(refs[1].line).toBe(3);
  });
});

describe('extractCommandReferences', () => {
  it('extracts npm run commands with line numbers', () => {
    const content = `## Commands\n\nnpm run build\nnpm run test`;
    const refs = extractCommandReferences(content);

    expect(refs).toContainEqual(expect.objectContaining({ script: 'build', line: 3 }));
    expect(refs).toContainEqual(expect.objectContaining({ script: 'test', line: 4 }));
  });

  it('extracts pnpm and yarn commands', () => {
    const content = `pnpm run lint\nyarn test`;
    const refs = extractCommandReferences(content);

    expect(refs.some(r => r.script === 'lint')).toBe(true);
    expect(refs.some(r => r.script === 'test')).toBe(true);
  });

  it('skips built-in commands (install, init, add, etc.)', () => {
    const content = `npm install\npnpm add foo\nyarn init`;
    const refs = extractCommandReferences(content);

    expect(refs).toHaveLength(0);
  });

  it('extracts npx commands but marks them as npx', () => {
    const content = `npx tsc --noEmit`;
    const refs = extractCommandReferences(content);

    expect(refs).toContainEqual(expect.objectContaining({ manager: 'npx', script: 'tsc' }));
  });
});
