import { describe, it, expect } from 'vitest';
import { missingClaudeMd } from '../../src/rules/missing-claudemd.js';
import type { ProjectData, RuleContext, SessionData } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async () => false,
    readFile: async () => null,
  };
}

function makeSession(): SessionData {
  return {
    file: 'session.jsonl',
    startTime: new Date('2024-01-01'),
    durationMinutes: 10,
    totalTokens: 1000,
    inputTokens: 800,
    outputTokens: 200,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    toolCalls: [],
    errors: [],
    model: 'claude-3-5-sonnet',
  };
}

describe('missingClaudeMd rule', () => {
  it('returns info insight when project has sessions but no CLAUDE.md', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      sessions: [makeSession()],
      claudeMdContent: undefined,
    };

    const insights = await missingClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'missing-claudemd',
      severity: 'info',
      category: 'claudemd',
    });
  });

  it('returns 0 insights when project has a CLAUDE.md', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      sessions: [makeSession()],
      claudeMdContent: '# My Project\n\nSome instructions.',
    };

    const insights = await missingClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });

  it('returns 0 insights when project has no sessions and no CLAUDE.md', async () => {
    const project: ProjectData = {
      path: '/project',
      name: 'TestProject',
      sessions: [],
      claudeMdContent: undefined,
    };

    const insights = await missingClaudeMd(project, mockCtx());

    expect(insights).toHaveLength(0);
  });
});
