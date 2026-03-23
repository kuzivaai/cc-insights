import { describe, it, expect } from 'vitest';
import { thinClaudeMd } from '../../src/rules/thin-claudemd.js';
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
    name: 'TestProject',
    claudeMdContent: content,
    claudeMdPath: '/project/CLAUDE.md',
    sessions: [],
  };
}

describe('thinClaudeMd rule', () => {
  it('returns info insight for a 5-line CLAUDE.md (below threshold of 10)', async () => {
    const project = makeProject(5);
    const insights = await thinClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'thin-claudemd',
      severity: 'info',
      category: 'claudemd',
    });
    expect(insights[0].evidence).toHaveProperty('lines', 5);
  });

  it('returns 0 insights for a 15-line CLAUDE.md (above threshold)', async () => {
    const project = makeProject(15);
    const insights = await thinClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns info at exactly 9 lines (boundary: strict <10)', async () => {
    const project = makeProject(9);
    const insights = await thinClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(1);
  });

  it('returns 0 insights at exactly 10 lines (boundary: not < 10)', async () => {
    const project = makeProject(10);
    const insights = await thinClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when claudeMdContent is absent', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      sessions: [],
    };

    const insights = await thinClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });
});
