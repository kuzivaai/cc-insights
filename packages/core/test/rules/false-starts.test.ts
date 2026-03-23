import { describe, it, expect } from 'vitest';
import { falseStarts } from '../../src/rules/false-starts.js';
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

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    file: 'session.jsonl',
    startTime: new Date('2024-01-15T10:00:00Z'),
    durationMinutes: 1,
    totalTokens: 100,
    inputTokens: 50,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    toolCalls: [],
    errors: [],
    model: 'claude-sonnet-4-5',
    ...overrides,
  };
}

function makeProject(sessions: SessionData[]): ProjectData {
  return {
    path: '/project',
    projectCwd: '/project',
    name: 'TestProject',
    sessions,
  };
}

describe('falseStarts rule', () => {
  it('produces an info insight when 4 sessions on same day are all under threshold', async () => {
    const sessions = [
      makeSession({ startTime: new Date('2024-01-15T09:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
      makeSession({ startTime: new Date('2024-01-15T10:00:00Z'), durationMinutes: 1, totalTokens: 200 }),
      makeSession({ startTime: new Date('2024-01-15T11:00:00Z'), durationMinutes: 1, totalTokens: 150 }),
      makeSession({ startTime: new Date('2024-01-15T12:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
    ];
    const project = makeProject(sessions);
    const ctx = mockCtx();

    const insights = await falseStarts(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'false-starts',
      severity: 'info',
      category: 'workflow',
    });
    expect(insights[0].message).toContain('4');
    expect(insights[0].message).toContain('2024-01-15');
    expect(insights[0].evidence).toMatchObject({
      date: '2024-01-15',
      count: 4,
    });
  });

  it('returns no insight when only 2 sessions are under threshold (below falseStartMinCount of 3)', async () => {
    const sessions = [
      makeSession({ startTime: new Date('2024-01-15T09:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
      makeSession({ startTime: new Date('2024-01-15T10:00:00Z'), durationMinutes: 1, totalTokens: 200 }),
    ];
    const project = makeProject(sessions);
    const ctx = mockCtx();

    const insights = await falseStarts(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('detects false starts separately per day when sessions span multiple days', async () => {
    const sessions = [
      // Day 1: 3 false starts
      makeSession({ startTime: new Date('2024-01-15T09:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
      makeSession({ startTime: new Date('2024-01-15T10:00:00Z'), durationMinutes: 1, totalTokens: 200 }),
      makeSession({ startTime: new Date('2024-01-15T11:00:00Z'), durationMinutes: 1, totalTokens: 150 }),
      // Day 2: 3 false starts
      makeSession({ startTime: new Date('2024-01-16T09:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
      makeSession({ startTime: new Date('2024-01-16T10:00:00Z'), durationMinutes: 1, totalTokens: 200 }),
      makeSession({ startTime: new Date('2024-01-16T11:00:00Z'), durationMinutes: 1, totalTokens: 150 }),
    ];
    const project = makeProject(sessions);
    const ctx = mockCtx();

    const insights = await falseStarts(project, ctx);

    expect(insights).toHaveLength(2);
    const dates = insights.map(i => (i.evidence as { date: string }).date).sort();
    expect(dates).toEqual(['2024-01-15', '2024-01-16']);
  });

  it('does not count sessions that exceed duration threshold', async () => {
    const sessions = [
      // These are too long (>= falseStartMaxMinutes of 2)
      makeSession({ startTime: new Date('2024-01-15T09:00:00Z'), durationMinutes: 5, totalTokens: 100 }),
      makeSession({ startTime: new Date('2024-01-15T10:00:00Z'), durationMinutes: 10, totalTokens: 100 }),
      makeSession({ startTime: new Date('2024-01-15T11:00:00Z'), durationMinutes: 3, totalTokens: 100 }),
      // Only this one qualifies
      makeSession({ startTime: new Date('2024-01-15T12:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
    ];
    const project = makeProject(sessions);
    const ctx = mockCtx();

    const insights = await falseStarts(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('does not count sessions that exceed token threshold', async () => {
    const sessions = [
      // These have too many tokens (>= falseStartMaxTokens of 500)
      makeSession({ startTime: new Date('2024-01-15T09:00:00Z'), durationMinutes: 1, totalTokens: 600 }),
      makeSession({ startTime: new Date('2024-01-15T10:00:00Z'), durationMinutes: 1, totalTokens: 1000 }),
      makeSession({ startTime: new Date('2024-01-15T11:00:00Z'), durationMinutes: 1, totalTokens: 500 }),
      // Only this one qualifies
      makeSession({ startTime: new Date('2024-01-15T12:00:00Z'), durationMinutes: 1, totalTokens: 100 }),
    ];
    const project = makeProject(sessions);
    const ctx = mockCtx();

    const insights = await falseStarts(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insights when project has no sessions', async () => {
    const project = makeProject([]);
    const ctx = mockCtx();

    const insights = await falseStarts(project, ctx);

    expect(insights).toHaveLength(0);
  });
});
