import { describe, it, expect } from 'vitest';
import { analyse } from '../src/index.js';
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
});
