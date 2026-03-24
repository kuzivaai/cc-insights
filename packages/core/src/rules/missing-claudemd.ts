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
        fix: {
          description: 'Generate starter CLAUDE.md',
          startLine: 1,
          endLine: 1,
          newText: '# Project\n\n## Commands\n\n```bash\n# Add your build/test commands here\n```\n\n## Conventions\n\n- Add project-specific rules here\n',
        },
        evidence: { sessionCount: project.sessions.length },
      },
    ];
  }
  return [];
}
