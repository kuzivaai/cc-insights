import type { Insight, ProjectData, RuleContext } from '../types.js';

export async function missingClaudeMd(project: ProjectData, _ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent && project.sessions.length > 0) {
    return [
      {
        rule: 'missing-claudemd',
        severity: 'info',
        category: 'claudemd',
        message: `No CLAUDE.md found for "${project.name}" — Claude has no project-specific instructions`,
        suggestedFix: 'Create a CLAUDE.md in the project root with your tech stack, commands, and conventions',
        evidence: { sessionCount: project.sessions.length },
      },
    ];
  }
  return [];
}
