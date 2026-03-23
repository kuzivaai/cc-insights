import { describe, it, expect } from 'vitest';
import { missingBuildCmd } from '../../src/rules/missing-build-cmd.js';
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

describe('missingBuildCmd rule', () => {
  it('returns warning when CLAUDE.md has no build/test/lint commands', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      claudeMdContent: '# My Project\n\nThis is the project description.\n\nNo commands mentioned here.',
      claudeMdPath: '/project/CLAUDE.md',
      sessions: [],
    };

    const insights = await missingBuildCmd(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'missing-build-cmd',
      severity: 'warning',
      category: 'claudemd',
    });
  });

  it('returns 0 insights when CLAUDE.md contains npm run build', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      claudeMdContent: '# Commands\n\nRun `npm run build` to compile the project.',
      claudeMdPath: '/project/CLAUDE.md',
      sessions: [],
    };

    const insights = await missingBuildCmd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when CLAUDE.md contains test command', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      claudeMdContent: '# Verification\n\nRun the test suite before committing.',
      claudeMdPath: '/project/CLAUDE.md',
      sessions: [],
    };

    const insights = await missingBuildCmd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('skips projects named "Home" (global CLAUDE.md)', async () => {
    const project: ProjectData = {
      path: '/home/user/.claude',
      name: 'Home',
      claudeMdContent: '# Global Rules\n\nAlways be helpful.',
      claudeMdPath: '/home/user/.claude/CLAUDE.md',
      sessions: [],
    };

    const insights = await missingBuildCmd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when claudeMdContent is absent', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      sessions: [],
    };

    const insights = await missingBuildCmd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });
});
