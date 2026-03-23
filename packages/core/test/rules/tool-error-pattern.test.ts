import { describe, it, expect } from 'vitest';
import { toolErrorPattern } from '../../src/rules/tool-error-pattern.js';
import type { ProjectData, RuleContext, SessionData, ToolCall } from '../../src/types.js';
import { DEFAULT_THRESHOLDS } from '../../src/defaults.js';

function mockCtx(): RuleContext {
  return {
    thresholds: DEFAULT_THRESHOLDS,
    resolvePath: (ref) => `/project/${ref}`,
    fileExists: async () => false,
    readFile: async () => null,
  };
}

function makeSession(toolCalls: ToolCall[]): SessionData {
  return {
    file: 'session.jsonl',
    startTime: new Date('2024-01-01T10:00:00Z'),
    durationMinutes: 30,
    totalTokens: 1000,
    inputTokens: 500,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    toolCalls,
    errors: [],
    model: 'claude-sonnet-4-5',
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

function makeBashCalls(total: number, failures: number): ToolCall[] {
  const calls: ToolCall[] = [];
  for (let i = 0; i < total; i++) {
    if (i < failures) {
      calls.push({ tool: 'Bash', success: false, errorMessage: 'exit code 1', errorCategory: 'command-failed' });
    } else {
      calls.push({ tool: 'Bash', success: true });
    }
  }
  return calls;
}

describe('toolErrorPattern rule', () => {
  it('produces 1 warning when Bash has 25% failure rate (5/20 calls)', async () => {
    const session = makeSession(makeBashCalls(20, 5));
    const project = makeProject([session]);
    const ctx = mockCtx();

    const insights = await toolErrorPattern(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      rule: 'tool-error-pattern',
      severity: 'warning',
      category: 'failure',
    });
    expect(insights[0].message).toContain('Bash');
    expect(insights[0].message).toContain('25%');
    expect(insights[0].evidence).toMatchObject({
      tool: 'Bash',
      failureRate: 25,
      totalCalls: 20,
      errorCount: 5,
      topErrorCategory: 'command-failed',
    });
  });

  it('returns no insights when tool has 0 errors (10 calls, 0 failures)', async () => {
    const session = makeSession(makeBashCalls(10, 0));
    const project = makeProject([session]);
    const ctx = mockCtx();

    const insights = await toolErrorPattern(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insight when failure rate equals the threshold exactly (10 calls, 1 error = 10%)', async () => {
    const session = makeSession(makeBashCalls(10, 1));
    const project = makeProject([session]);
    const ctx = mockCtx();

    // 1/10 = 10% which equals toolErrorRatePercent (10) — must be OVER, not equal
    const insights = await toolErrorPattern(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('returns no insight when call count is at or below toolErrorMinCalls (5 calls, 3 errors)', async () => {
    const session = makeSession(makeBashCalls(5, 3));
    const project = makeProject([session]);
    const ctx = mockCtx();

    // 5 calls <= toolErrorMinCalls (10) — below minimum, ignore
    const insights = await toolErrorPattern(project, ctx);

    expect(insights).toHaveLength(0);
  });

  it('produces separate insights for multiple failing tools', async () => {
    const bashCalls = makeBashCalls(20, 5); // 25% failure
    const readCalls: ToolCall[] = [];
    for (let i = 0; i < 20; i++) {
      if (i < 6) {
        readCalls.push({ tool: 'Read', success: false, errorCategory: 'file-not-found' });
      } else {
        readCalls.push({ tool: 'Read', success: true });
      }
    }

    const session = makeSession([...bashCalls, ...readCalls]);
    const project = makeProject([session]);
    const ctx = mockCtx();

    const insights = await toolErrorPattern(project, ctx);

    expect(insights).toHaveLength(2);
    const tools = insights.map(i => (i.evidence as { tool: string }).tool).sort();
    expect(tools).toEqual(['Bash', 'Read'].sort());
  });

  it('aggregates tool calls across multiple sessions', async () => {
    // 2 sessions, each with 10 Bash calls (3 failures each) = 20 total, 6 failures = 30%
    const session1 = makeSession(makeBashCalls(10, 3));
    const session2 = makeSession(makeBashCalls(10, 3));
    const project = makeProject([session1, session2]);
    const ctx = mockCtx();

    const insights = await toolErrorPattern(project, ctx);

    expect(insights).toHaveLength(1);
    expect(insights[0].evidence).toMatchObject({
      totalCalls: 20,
      errorCount: 6,
      failureRate: 30,
    });
  });
});
