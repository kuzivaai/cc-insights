import type { Insight, ProjectData, RuleContext } from '../types.js';

export async function falseStarts(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  const byDay = new Map<string, number>();

  for (const session of project.sessions) {
    if (
      session.durationMinutes < ctx.thresholds.falseStartMaxMinutes &&
      session.totalTokens < ctx.thresholds.falseStartMaxTokens
    ) {
      const day = session.startTime.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
  }

  const insights: Insight[] = [];
  for (const [day, count] of byDay) {
    if (count >= ctx.thresholds.falseStartMinCount) {
      insights.push({
        rule: 'false-starts',
        severity: 'info',
        category: 'workflow',
        message: `${count} false starts on ${day} — sessions under ${ctx.thresholds.falseStartMaxMinutes} min with <${ctx.thresholds.falseStartMaxTokens} tokens`,
        suggestedFix: `Check prompt clarity or CLAUDE.md setup instructions — ${count} sessions abandoned quickly`,
        evidence: {
          date: day,
          count,
          thresholdMinutes: ctx.thresholds.falseStartMaxMinutes,
          thresholdTokens: ctx.thresholds.falseStartMaxTokens,
        },
      });
    }
  }

  return insights;
}
