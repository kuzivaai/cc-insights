import { describe, it, expect } from 'vitest';
import { staleFileRef } from '../../src/rules/stale-file-ref.js';
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

describe('staleFileRef rule', () => {
  it('returns 1 warning for a missing file reference with correct metadata', async () => {
    const content = [
      '# My Project',
      '',
      'See `src/index.ts` for the entry point.',
      'See `src/deleted.ts` for the old code.',
    ].join('\n');

    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx(['src/index.ts']);

    const insights = await staleFileRef(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'stale-file-ref',
      severity: 'warning',
      category: 'claudemd',
      file: '/project/CLAUDE.md',
      line: 4,
    });
    expect(insights[0].message).toContain('src/deleted.ts');
    expect(insights[0].evidence).toMatchObject({ reference: 'src/deleted.ts', line: 4 });
  });

  it('populates section field from heading context', async () => {
    const content = [
      '# Project',
      '',
      'See `src/deleted.ts` for details.',
    ].join('\n');

    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx([]);

    const insights = await staleFileRef(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0].evidence).toMatchObject({ section: 'Project' });
    expect(insights[0].message).toContain('"Project"');
  });

  it('uses correct section when ref is under a nested heading', async () => {
    const content = [
      '# Overview',
      '',
      'Some intro.',
      '',
      '## Architecture',
      '',
      'See `src/missing.ts` for the architecture.',
    ].join('\n');

    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx([]);

    const insights = await staleFileRef(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0].evidence).toMatchObject({ section: 'Architecture' });
  });

  it('returns 0 insights when all file references are valid', async () => {
    const content = 'See `src/index.ts` and `src/utils.ts`.';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx(['src/index.ts', 'src/utils.ts']);

    const insights = await staleFileRef(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when claudeMdContent is absent', async () => {
    const project = makeProject({ claudeMdContent: undefined });
    const ctx = mockCtx([]);

    const insights = await staleFileRef(project, ctx);

    expect(insights).toHaveLength(0);
  });
});
