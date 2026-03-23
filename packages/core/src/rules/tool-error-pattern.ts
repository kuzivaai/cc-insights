import type { Insight, ProjectData, RuleContext } from '../types.js';

export async function toolErrorPattern(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  const toolStats = new Map<string, { calls: number; errors: number; categories: Map<string, number> }>();

  for (const session of project.sessions) {
    for (const call of session.toolCalls) {
      const stats = toolStats.get(call.tool) || { calls: 0, errors: 0, categories: new Map() };
      stats.calls++;
      if (!call.success) {
        stats.errors++;
        const cat = call.errorCategory || 'other';
        stats.categories.set(cat, (stats.categories.get(cat) || 0) + 1);
      }
      toolStats.set(call.tool, stats);
    }
  }

  const insights: Insight[] = [];
  const minCalls = ctx.thresholds.toolErrorMinCalls;
  const maxRate = ctx.thresholds.toolErrorRatePercent / 100;

  for (const [tool, stats] of toolStats) {
    if (stats.calls <= minCalls) continue;
    const failureRate = stats.errors / stats.calls;
    if (failureRate <= maxRate) continue;

    // Find top error category
    let topCategory = 'other';
    let topCount = 0;
    for (const [cat, count] of stats.categories) {
      if (count > topCount) {
        topCategory = cat;
        topCount = count;
      }
    }

    insights.push({
      rule: 'tool-error-pattern',
      severity: 'warning',
      category: 'failure',
      message: `Tool \`${tool}\` fails ${Math.round(failureRate * 100)}% of the time — most common error: ${topCategory}`,
      suggestedFix: `Investigate why ${tool} is failing. Most common error: ${topCategory}`,
      evidence: {
        tool,
        failureRate: Math.round(failureRate * 100),
        totalCalls: stats.calls,
        errorCount: stats.errors,
        topErrorCategory: topCategory,
      },
    });
  }

  return insights;
}
