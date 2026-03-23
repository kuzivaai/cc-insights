import { describe, it, expect } from 'vitest';
import { validateFileReferences, validateCommandReferences } from '../../src/health/validate.js';
import type { RuleContext } from '../../src/types.js';
import type { FileReference, CommandReference } from '../../src/health/references.js';

function mockContext(existingFiles: string[], packageScripts: Record<string, string> = {}): RuleContext {
  return {
    thresholds: {} as any,
    resolvePath: (ref: string) => `/project/${ref}`,
    fileExists: async (path: string) => existingFiles.some(f => path.endsWith(f)),
    readFile: async (path: string) => {
      if (path.endsWith('package.json')) {
        return JSON.stringify({ scripts: packageScripts });
      }
      return null;
    },
  };
}

describe('validateFileReferences', () => {
  it('marks existing files as valid', async () => {
    const refs: FileReference[] = [{ reference: 'src/index.ts', line: 5 }];
    const ctx = mockContext(['src/index.ts']);
    const result = await validateFileReferences(refs, ctx);
    expect(result).toHaveLength(0);
  });

  it('returns stale references for missing files', async () => {
    const refs: FileReference[] = [{ reference: 'src/deleted.ts', line: 10 }];
    const ctx = mockContext([]);
    const result = await validateFileReferences(refs, ctx);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reference: 'src/deleted.ts', line: 10, type: 'file' });
  });
});

describe('validateCommandReferences', () => {
  it('marks existing scripts as valid', async () => {
    const refs: CommandReference[] = [{ manager: 'npm', script: 'build', raw: 'npm run build', line: 3 }];
    const ctx = mockContext([], { build: 'tsc' });
    const result = await validateCommandReferences(refs, ctx);
    expect(result).toHaveLength(0);
  });

  it('returns stale references for missing scripts', async () => {
    const refs: CommandReference[] = [{ manager: 'npm', script: 'deploy', raw: 'npm run deploy', line: 7 }];
    const ctx = mockContext([], { build: 'tsc' });
    const result = await validateCommandReferences(refs, ctx);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reference: 'npm run deploy', line: 7, type: 'command' });
  });

  it('skips npx commands (cannot validate)', async () => {
    const refs: CommandReference[] = [{ manager: 'npx', script: 'tsc', raw: 'npx tsc', line: 1 }];
    const ctx = mockContext([]);
    const result = await validateCommandReferences(refs, ctx);
    expect(result).toHaveLength(0);
  });
});
