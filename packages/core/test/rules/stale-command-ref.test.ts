import { describe, it, expect } from 'vitest';
import { staleCommandRef } from '../../src/rules/stale-command-ref.js';
import type { ProjectData, RuleContext } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(existingFiles: string[] = [], packageScripts: Record<string, string> = {}): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async (path) => existingFiles.some(f => path.endsWith(f)),
    readFile: async (path) => {
      if (path.endsWith('package.json')) return JSON.stringify({ scripts: packageScripts });
      return null;
    },
  };
}

function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    path: '/project',
    projectCwd: '/project',
    name: 'TestProject',
    sessions: [],
    ...overrides,
  };
}

describe('staleCommandRef rule', () => {
  it('returns 1 warning for a missing script with correct metadata', async () => {
    const content = [
      '## Commands',
      '',
      'Run `npm run build` to compile.',
      'Run `npm run deploy` to ship.',
    ].join('\n');

    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx([], { build: 'tsc' });

    const insights = await staleCommandRef(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'stale-command-ref',
      severity: 'warning',
      category: 'claudemd',
      file: '/project/CLAUDE.md',
      line: 4,
    });
    expect(insights[0].message).toContain('npm run deploy');
    expect(insights[0].evidence).toMatchObject({ line: 4 });
  });

  it('returns 0 insights when all scripts exist in package.json', async () => {
    const content = 'Run `npm run build` and `npm run test`.';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx([], { build: 'tsc', test: 'vitest' });

    const insights = await staleCommandRef(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when claudeMdContent is absent', async () => {
    const project = makeProject({ claudeMdContent: undefined });
    const ctx = mockCtx([]);

    const insights = await staleCommandRef(project, ctx);

    expect(insights).toHaveLength(0);
  });
});
