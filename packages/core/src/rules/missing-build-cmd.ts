import type { Insight, ProjectData, RuleContext } from '../types.js';

const BUILD_CMD_PATTERN = /\b(build|test|lint|dev|start|run)\b/i;

export async function missingBuildCmd(project: ProjectData, _ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent) return [];
  if (project.name === 'Home') return [];

  if (!BUILD_CMD_PATTERN.test(project.claudeMdContent)) {
    return [
      {
        rule: 'missing-build-cmd',
        severity: 'warning',
        category: 'claudemd',
        file: project.claudeMdPath,
        message: 'CLAUDE.md has no build, test, or lint commands — Claude cannot verify its own changes',
        suggestedFix: 'Add a Commands section with the commands Claude should run to build, test, and lint the project',
        evidence: {},
      },
    ];
  }

  return [];
}
