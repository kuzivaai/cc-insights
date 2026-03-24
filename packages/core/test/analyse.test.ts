import { describe, it, expect } from 'vitest';
import { analyse, applyFixes } from '../src/index.js';
import type { ProjectData } from '../src/types.js';

describe('analyse()', () => {
  it('runs all rules and returns insights + health reports', async () => {
    const projects: ProjectData[] = [
      {
        path: '/sessions/project-a',
        projectCwd: '/tmp/cc-insights-test-project',
        name: 'project-a',
        claudeMdContent: '# Project A\n\nSee `nonexistent.ts` for details.',
        claudeMdPath: '/tmp/cc-insights-test-project/CLAUDE.md',
        sessions: [],
      },
    ];

    const result = await analyse({ projects });

    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.health).toHaveLength(1);
    expect(result.health[0].project).toBe('project-a');
    // Should find stale-file-ref for nonexistent.ts
    expect(result.insights.some(i => i.rule === 'stale-file-ref')).toBe(true);
    // Should find thin-claudemd (3 lines < 10)
    expect(result.insights.some(i => i.rule === 'thin-claudemd')).toBe(true);
  });

  it('accepts custom thresholds', async () => {
    const projects: ProjectData[] = [
      {
        path: '/sessions/project',
        projectCwd: '/tmp/cc-insights-test',
        name: 'project',
        claudeMdContent: '# Small\n\nJust a few lines.',
        claudeMdPath: '/tmp/cc-insights-test/CLAUDE.md',
        sessions: [],
      },
    ];

    const result = await analyse({ projects, thresholds: { claudemdThinLines: 2 } });
    expect(result.insights.some(i => i.rule === 'thin-claudemd')).toBe(false);
  });

  it('catches rule errors and continues', async () => {
    const projects: ProjectData[] = [
      { path: '', name: '', sessions: [] },
    ];
    const result = await analyse({ projects });
    expect(result).toBeDefined();
    expect(result.insights).toBeDefined();
  });

  it('includes fix field on auto-fixable insights', async () => {
    const projects: ProjectData[] = [
      {
        path: '/sessions/project',
        projectCwd: '/tmp/cc-insights-test-fix',
        name: 'project',
        claudeMdContent: '# Project\n\nSee `nonexistent.ts` for details.',
        claudeMdPath: '/tmp/cc-insights-test-fix/CLAUDE.md',
        sessions: [],
      },
    ];

    const result = await analyse({ projects });

    const staleRef = result.insights.find(i => i.rule === 'stale-file-ref');
    expect(staleRef).toBeDefined();
    expect(staleRef!.fix).toBeDefined();
    expect(staleRef!.fix!.description).toBe('Remove stale reference');
    expect(staleRef!.fix!.newText).toBe('');
  });

  it('filters suppressed insights', async () => {
    const content = [
      '<!-- cc-insights-disable-file stale-file-ref -->',
      '# Project',
      '',
      'See `nonexistent.ts` for details.',
    ].join('\n');

    const projects: ProjectData[] = [
      {
        path: '/sessions/project',
        projectCwd: '/tmp/cc-insights-test-suppress',
        name: 'project',
        claudeMdContent: content,
        claudeMdPath: '/tmp/cc-insights-test-suppress/CLAUDE.md',
        sessions: [],
      },
    ];

    const result = await analyse({ projects });

    // stale-file-ref should be suppressed
    expect(result.insights.some(i => i.rule === 'stale-file-ref')).toBe(false);
    // Other rules should still fire
    expect(result.insights.some(i => i.rule === 'thin-claudemd')).toBe(true);
  });
});

describe('applyFixes()', () => {
  it('deletes lines when newText is empty', () => {
    const content = 'line 1\nline 2\nline 3\nline 4';
    const insights = [{
      rule: 'stale-file-ref',
      severity: 'warning' as const,
      category: 'claudemd' as const,
      message: 'test',
      evidence: {},
      fix: { description: 'Remove', startLine: 2, endLine: 2, newText: '' },
    }];

    const result = applyFixes(content, insights);
    expect(result).toBe('line 1\nline 3\nline 4');
  });

  it('replaces lines when newText is provided', () => {
    const content = 'line 1\nold line\nline 3';
    const insights = [{
      rule: 'test-rule',
      severity: 'warning' as const,
      category: 'claudemd' as const,
      message: 'test',
      evidence: {},
      fix: { description: 'Replace', startLine: 2, endLine: 2, newText: 'new line' },
    }];

    const result = applyFixes(content, insights);
    expect(result).toBe('line 1\nnew line\nline 3');
  });

  it('handles multiple fixes bottom-to-top', () => {
    const content = 'line 1\nbad 2\nline 3\nbad 4\nline 5';
    const insights = [
      {
        rule: 'r1',
        severity: 'warning' as const,
        category: 'claudemd' as const,
        message: 'test',
        evidence: {},
        fix: { description: 'Remove', startLine: 2, endLine: 2, newText: '' },
      },
      {
        rule: 'r2',
        severity: 'warning' as const,
        category: 'claudemd' as const,
        message: 'test',
        evidence: {},
        fix: { description: 'Remove', startLine: 4, endLine: 4, newText: '' },
      },
    ];

    const result = applyFixes(content, insights);
    expect(result).toBe('line 1\nline 3\nline 5');
  });

  it('skips insights without fix', () => {
    const content = 'line 1\nline 2';
    const insights = [{
      rule: 'no-fix',
      severity: 'info' as const,
      category: 'claudemd' as const,
      message: 'test',
      evidence: {},
    }];

    const result = applyFixes(content, insights);
    expect(result).toBe('line 1\nline 2');
  });
});
