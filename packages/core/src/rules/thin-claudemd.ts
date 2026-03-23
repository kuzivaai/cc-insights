import type { Insight, ProjectData, RuleContext } from '../types.js';

export async function thinClaudeMd(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent) return [];

  const lineCount = project.claudeMdContent.split('\n').length;

  if (lineCount < ctx.thresholds.claudemdThinLines) {
    return [
      {
        rule: 'thin-claudemd',
        severity: 'info',
        category: 'claudemd',
        file: project.claudeMdPath,
        message: `CLAUDE.md is very short (${lineCount} lines) — Claude may lack enough context to work effectively`,
        suggestedFix: 'Add your tech stack, key commands, code style conventions, and project-specific rules',
        evidence: { lines: lineCount },
      },
    ];
  }

  return [];
}
