import { describe, it, expect } from 'vitest';
import { fillerPhrase } from '../../src/rules/filler-phrase.js';
import type { ProjectData, RuleContext } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(): RuleContext {
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

describe('fillerPhrase rule', () => {
  it('detects "Always remember to" and rewrites with capitalised remainder', async () => {
    const project = makeProject({
      claudeMdContent: 'Always remember to use single quotes',
      claudeMdPath: '/project/CLAUDE.md',
    });

    const insights = await fillerPhrase(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'filler-phrase',
      severity: 'warning',
      category: 'claudemd',
      line: 1,
    });
    expect(insights[0].fix).toMatchObject({
      startLine: 1,
      endLine: 1,
      newText: 'Use single quotes',
    });
  });

  it('preserves list marker when rewriting', async () => {
    const project = makeProject({
      claudeMdContent: '- Please make sure to run tests',
      claudeMdPath: '/project/CLAUDE.md',
    });

    const insights = await fillerPhrase(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0].fix).toMatchObject({
      newText: '- Run tests',
    });
  });

  it('does not flag lines inside code blocks', async () => {
    const content = [
      '```',
      'Always remember to use single quotes',
      '```',
    ].join('\n');
    const project = makeProject({
      claudeMdContent: content,
      claudeMdPath: '/project/CLAUDE.md',
    });

    const insights = await fillerPhrase(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when claudeMdContent is absent', async () => {
    const project = makeProject({ claudeMdContent: undefined });

    const insights = await fillerPhrase(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('does not flag lines that do not start with a filler prefix', async () => {
    const project = makeProject({
      claudeMdContent: 'Build your tests carefully',
      claudeMdPath: '/project/CLAUDE.md',
    });

    const insights = await fillerPhrase(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('produces multiple insights for multiple filler lines', async () => {
    const content = [
      'Always remember to use single quotes',
      'Some normal line',
      "Don't forget to run linting",
    ].join('\n');
    const project = makeProject({
      claudeMdContent: content,
      claudeMdPath: '/project/CLAUDE.md',
    });

    const insights = await fillerPhrase(project, mockCtx());

    expect(insights).toHaveLength(2);
    expect(insights[0].line).toBe(1);
    expect(insights[1].line).toBe(3);
  });
});
