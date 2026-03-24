import { describe, it, expect } from 'vitest';
import { noStructure } from '../../src/rules/no-structure.js';
import type { ProjectData, RuleContext } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async () => true,
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

describe('noStructure rule', () => {
  it('returns warning with fix when CLAUDE.md has no headings', async () => {
    const content = 'Just some text\nand more text';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });

    const insights = await noStructure(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'no-structure',
      severity: 'warning',
      category: 'claudemd',
      file: '/project/CLAUDE.md',
      line: 1,
    });
    expect(insights[0].message).toContain('no headings');
    expect(insights[0].fix).toBeDefined();
  });

  it('returns no insights when CLAUDE.md has headings', async () => {
    const content = '# Title\n\nContent';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });

    const insights = await noStructure(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when claudeMdContent is empty', async () => {
    const project = makeProject({ claudeMdContent: undefined });

    const insights = await noStructure(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('fix includes the project name as the heading', async () => {
    const content = 'Just some text\nand more text';
    const project = makeProject({
      claudeMdContent: content,
      claudeMdPath: '/project/CLAUDE.md',
      name: 'MyApp',
    });

    const insights = await noStructure(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0].fix!.newText).toContain('# MyApp');
    expect(insights[0].fix!.description).toContain('MyApp');
  });

  it('returns no insights when content is only whitespace', async () => {
    const content = '   \n  \n   ';
    const project = makeProject({ claudeMdContent: content, claudeMdPath: '/project/CLAUDE.md' });

    const insights = await noStructure(project, mockCtx());

    expect(insights).toHaveLength(0);
  });
});
