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

function makeProject(claudeMdContent?: string): ProjectData {
  return {
    path: '/project',
    name: 'TestProject',
    claudeMdContent,
    claudeMdPath: '/project/CLAUDE.md',
    sessions: [],
  };
}

describe('missingBuildCmd rule', () => {
  it('returns warning when prose says "Run the tests manually" (no actual command)', async () => {
    const project = makeProject('# Project\n\nRun the tests manually before deploying.');
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(1);
    expect(insights[0].rule).toBe('missing-build-cmd');
  });

  it('returns warning when prose says "We test everything carefully" (no actual command)', async () => {
    const project = makeProject('# QA\n\nWe test everything carefully and run checks.');
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(1);
  });

  it('passes when code block contains npm run test', async () => {
    const content = '# Commands\n\n```bash\nnpm run test\n```';
    const project = makeProject(content);
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(0);
  });

  it('passes when backtick-wrapped command: `npm run build`', async () => {
    const content = '# Build\n\nRun `npm run build` to compile.';
    const project = makeProject(content);
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(0);
  });

  it('passes when shell prompt: $ npm test', async () => {
    const content = '# Verify\n\n$ npm test';
    const project = makeProject(content);
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(0);
  });

  it('passes when pnpm command in code block', async () => {
    const content = '```\npnpm build\n```';
    const project = makeProject(content);
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(0);
  });

  it('passes for cargo test command', async () => {
    const content = '```\ncargo test\n```';
    const project = makeProject(content);
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(0);
  });

  it('passes for npx command in backticks', async () => {
    const content = 'Run `npx tsc --noEmit` to type-check.';
    const project = makeProject(content);
    const insights = await missingBuildCmd(project, mockCtx());
    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when claudeMdContent is absent', async () => {
    const project = makeProject(undefined);
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
});
