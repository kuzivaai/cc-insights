import { describe, it, expect } from 'vitest';
import { claudemdBloat } from '../../src/rules/claudemd-bloat.js';
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

function makeProject(lines: number): ProjectData {
  const content = Array.from({ length: lines }, (_, i) => `Line ${i + 1}`).join('\n');
  return {
    path: '/project',
    projectCwd: '/project',
    name: 'TestProject',
    claudeMdContent: content,
    claudeMdPath: '/project/CLAUDE.md',
    sessions: [],
  };
}

describe('claudemdBloat rule', () => {
  it('returns a warning for a 350-line CLAUDE.md (over 300 threshold)', async () => {
    const project = makeProject(350);
    const insights = await claudemdBloat(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'claudemd-bloat',
      severity: 'warning',
      category: 'claudemd',
    });
    expect(insights[0].evidence).toHaveProperty('lines', 350);
  });

  it('returns 0 insights for a 200-line CLAUDE.md (under threshold)', async () => {
    const project = makeProject(200);
    const insights = await claudemdBloat(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns a warning at exactly 301 lines (> 300, not >=)', async () => {
    const project = makeProject(301);
    const insights = await claudemdBloat(project, mockCtx());

    expect(insights).toHaveLength(1);
  });

  it('returns 0 insights at exactly 300 lines (boundary: strict >)', async () => {
    const project = makeProject(300);
    const insights = await claudemdBloat(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('includes top sections by token cost in evidence', async () => {
    const content = [
      '# Section A',
      ...Array.from({ length: 150 }, () => 'content line'),
      '# Section B',
      ...Array.from({ length: 150 }, () => 'content line'),
    ].join('\n');
    const project: ProjectData = {
      path: '/project',
      projectCwd: '/project',
      name: 'TestProject',
      claudeMdContent: content,
      claudeMdPath: '/project/CLAUDE.md',
      sessions: [],
    };

    const insights = await claudemdBloat(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0].evidence).toHaveProperty('topSections');
    expect(Array.isArray(insights[0].evidence.topSections)).toBe(true);
  });

  it('returns 0 insights when claudeMdContent is absent', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      sessions: [],
    };
    const insights = await claudemdBloat(project, mockCtx());

    expect(insights).toHaveLength(0);
  });
});
