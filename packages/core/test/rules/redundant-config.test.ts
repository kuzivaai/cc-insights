import { describe, it, expect } from 'vitest';
import { redundantConfig } from '../../src/rules/redundant-config.js';
import type { ProjectData, RuleContext } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(packageScripts: Record<string, string> = {}): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async () => true,
    readFile: async (path) => {
      if (path.endsWith('package.json')) return JSON.stringify({ scripts: packageScripts });
      return null;
    },
  };
}

function mockCtxNoPackage(): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async () => false,
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

describe('redundantConfig rule', () => {
  it('flags standalone npm run build when package.json has build script', async () => {
    const content = '# Commands\n\n`npm run build`';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx({ build: 'tsc' });

    const insights = await redundantConfig(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'redundant-config',
      severity: 'warning',
      category: 'claudemd',
      line: 3,
    });
    expect(insights[0].message).toContain('npm run build');
    expect(insights[0].fix).toBeDefined();
    expect(insights[0].fix!.newText).toBe('');
  });

  it('does NOT flag lines with additional context around the command', async () => {
    const content = 'Run `npm run build` before committing for safety';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx({ build: 'tsc' });

    const insights = await redundantConfig(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when package.json is absent', async () => {
    const content = '`npm run build`';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtxNoPackage();

    const insights = await redundantConfig(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when package.json has no scripts', async () => {
    const content = '`npm run build`';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx({});

    const insights = await redundantConfig(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when claudeMdContent is absent', async () => {
    const project = makeProject({ claudeMdContent: undefined });
    const ctx = mockCtx({ build: 'tsc' });

    const insights = await redundantConfig(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('flags command inside code block that is just the command', async () => {
    const content = '# Commands\n\n```\nnpm run build\n```';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });
    const ctx = mockCtx({ build: 'tsc' });

    const insights = await redundantConfig(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0].line).toBe(4);
  });
});
