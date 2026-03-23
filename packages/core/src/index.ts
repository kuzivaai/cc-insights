import type { AnalyseOptions, AnalyseResult, Insight, HealthReport } from './types.js';
import { DEFAULT_THRESHOLDS } from './defaults.js';
import { createDefaultContext } from './context.js';
import { analyseClaudeMdHealth } from './health/index.js';
import { ALL_RULES } from './rules/index.js';

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

    for (const rule of ALL_RULES) {
      try {
        const ruleInsights = await rule(project, ctx);
        insights.push(...ruleInsights);
      } catch {
        // Rule failed — skip and continue
      }
    }

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

// Re-export public API
export { analyseClaudeMdHealth } from './health/index.js';
export { createDefaultContext } from './context.js';
export { DEFAULT_THRESHOLDS } from './defaults.js';

// Re-export types
export type {
  Insight, HealthReport, Section, StaleReference, Thresholds, RuleContext,
  ProjectData, SessionData, ToolCall, ErrorEvent, ErrorCategory,
  AnalyseOptions, AnalyseResult, ParseResult, Rule,
} from './types.js';
