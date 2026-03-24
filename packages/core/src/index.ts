import type { AnalyseOptions, AnalyseResult, Insight, HealthReport } from './types.js';
import { DEFAULT_THRESHOLDS } from './defaults.js';
import { createDefaultContext } from './context.js';
import { analyseClaudeMdHealth } from './health/index.js';
import { ALL_RULES } from './rules/index.js';
import { parseSuppressionsFromContent, isSuppressed } from './suppression.js';

export async function analyse(options: AnalyseOptions): Promise<AnalyseResult> {
  let projects = options.projects;

  if (!projects && options.claudeDir) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — parser not yet implemented; only reached when claudeDir is provided
    const { parseClaudeProjects } = await import('./parser/index.js');
    const parsed = await parseClaudeProjects(options.claudeDir);
    projects = parsed.projects;
  }

  if (!projects) {
    return { insights: [], health: [] };
  }

  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
  const insights: Insight[] = [];
  const health: HealthReport[] = [];

  for (const project of projects) {
    const ctx = project.projectCwd
      ? createDefaultContext(project.projectCwd, thresholds)
      : { thresholds, resolvePath: (r: string) => r, fileExists: async () => false, readFile: async () => null };

    const projectInsights: Insight[] = [];
    for (const rule of ALL_RULES) {
      try {
        const ruleInsights = await rule(project, ctx);
        projectInsights.push(...ruleInsights);
      } catch {
        // Rule failed — skip and continue
      }
    }

    // Filter suppressed insights
    const projectSuppressions = options.suppressions ||
      (project.claudeMdContent ? parseSuppressionsFromContent(project.claudeMdContent) : []);

    const filtered = projectInsights.filter(insight =>
      !insight.line || !isSuppressed(insight.rule, insight.line, projectSuppressions),
    );
    insights.push(...filtered);

    if (project.claudeMdContent && project.claudeMdPath) {
      try {
        const report = await analyseClaudeMdHealth(
          project.name,
          project.claudeMdPath,
          project.claudeMdContent,
          ctx,
        );
        health.push(report);
      } catch {
        // Health analysis failed — skip
      }
    }
  }

  return { insights, health };
}

export function applyFixes(content: string, insights: Insight[]): string {
  const fixable = insights
    .filter(i => i.fix)
    .sort((a, b) => (b.fix!.startLine) - (a.fix!.startLine)); // Bottom-to-top to preserve line numbers

  const lines = content.split('\n');

  for (const insight of fixable) {
    const fix = insight.fix!;
    const start = fix.startLine - 1; // 0-indexed
    const end = fix.endLine - 1;

    if (fix.newText === '') {
      // Delete lines
      lines.splice(start, end - start + 1);
    } else {
      // Replace lines
      lines.splice(start, end - start + 1, ...fix.newText.split('\n'));
    }
  }

  return lines.join('\n');
}

// Re-export public API
export { analyseClaudeMdHealth } from './health/index.js';
export { createDefaultContext } from './context.js';
export { DEFAULT_THRESHOLDS } from './defaults.js';
export { parseSuppressionsFromContent, isSuppressed } from './suppression.js';

// Re-export types
export type {
  Insight, InsightFix, Suppression,
  HealthReport, Section, StaleReference, Thresholds, RuleContext,
  ProjectData, SessionData, ToolCall, ErrorCategory,
  AnalyseOptions, AnalyseResult, ParseResult, Rule,
} from './types.js';
