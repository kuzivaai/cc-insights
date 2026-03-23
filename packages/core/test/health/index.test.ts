import { describe, it, expect } from 'vitest';
import { analyseClaudeMdHealth } from '../../src/health/index.js';
import type { RuleContext } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

describe('analyseClaudeMdHealth', () => {
  it('returns sections, stale refs, and token estimates', async () => {
    const ctx: RuleContext = {
      thresholds: DEFAULT_THRESHOLDS,
      resolvePath: (ref) => `/project/${ref}`,
      fileExists: async (path) => path.endsWith('index.ts'),
      readFile: async (path) => {
        if (path.endsWith('package.json')) return JSON.stringify({ scripts: { build: 'tsc' } });
        return null;
      },
    };

    const content = '# Project\n\nSee `src/index.ts` and `src/gone.ts`.\n\n## Commands\n\nnpm run build\nnpm run deploy';
    const report = await analyseClaudeMdHealth('test', '/project/CLAUDE.md', content, ctx);

    expect(report.totalLines).toBe(8);
    expect(report.sections).toHaveLength(2);
    expect(report.staleFileRefs).toHaveLength(1);
    expect(report.staleFileRefs[0].reference).toBe('src/gone.ts');
    expect(report.staleFileRefs[0].section).toBe('Project');
    expect(report.staleCommandRefs).toHaveLength(1);
    expect(report.staleCommandRefs[0].reference).toContain('deploy');
  });
});
