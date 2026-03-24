import { describe, it, expect } from 'vitest';
import { staleImport } from '../../src/rules/stale-import.js';
import type { ProjectData, RuleContext } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(existingPaths: string[] = []): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async (path) => existingPaths.includes(path),
    readFile: async () => null,
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

describe('staleImport rule', () => {
  it('flags broken @import where file does not exist', async () => {
    const project = makeProject({
      claudeMdContent: '@docs/rules.md',
      claudeMdPath: '/project/CLAUDE.md',
    });
    const ctx = mockCtx([]);

    const insights = await staleImport(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'stale-import',
      severity: 'warning',
      category: 'claudemd',
      file: '/project/CLAUDE.md',
      line: 1,
    });
    expect(insights[0].message).toContain('docs/rules.md');
    expect(insights[0].fix).toMatchObject({
      startLine: 1,
      endLine: 1,
      newText: '',
    });
  });

  it('does not flag @import where file exists', async () => {
    const project = makeProject({
      claudeMdContent: '@docs/rules.md',
      claudeMdPath: '/project/CLAUDE.md',
    });
    const ctx = mockCtx(['/project/docs/rules.md']);

    const insights = await staleImport(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('does not flag @mention in prose (not a whole-line import)', async () => {
    const project = makeProject({
      claudeMdContent: 'Contact @mention in prose for help',
      claudeMdPath: '/project/CLAUDE.md',
    });
    const ctx = mockCtx([]);

    const insights = await staleImport(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when claudeMdContent is absent', async () => {
    const project = makeProject({ claudeMdContent: undefined });
    const ctx = mockCtx([]);

    const insights = await staleImport(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('produces multiple insights for multiple broken imports with correct line numbers', async () => {
    const content = [
      '@docs/rules.md',
      '# Heading',
      '@docs/guidelines.md',
    ].join('\n');
    const project = makeProject({
      claudeMdContent: content,
      claudeMdPath: '/project/CLAUDE.md',
    });
    const ctx = mockCtx([]);

    const insights = await staleImport(project, ctx);

    expect(insights).toHaveLength(2);
    expect(insights[0].line).toBe(1);
    expect(insights[1].line).toBe(3);
  });
});
