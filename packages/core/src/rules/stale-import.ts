import type { Insight, ProjectData, RuleContext } from '../types.js';
import { dirname, resolve } from 'node:path';

export async function staleImport(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent || !project.claudeMdPath) return [];

  const lines = project.claudeMdContent.split('\n');
  const insights: Insight[] = [];
  const claudeMdDir = dirname(project.claudeMdPath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^@(\S+)$/);
    if (!match) continue;

    const importPath = match[1];
    const resolved = resolve(claudeMdDir, importPath);
    const exists = await ctx.fileExists(resolved);

    if (!exists) {
      insights.push({
        rule: 'stale-import',
        severity: 'warning',
        category: 'claudemd',
        file: project.claudeMdPath,
        line: i + 1,
        message: `Broken @import: \`${importPath}\` does not exist`,
        suggestedFix: `Remove the @import for \`${importPath}\``,
        evidence: { importPath, resolvedPath: resolved },
        fix: {
          description: 'Remove broken @import',
          startLine: i + 1,
          endLine: i + 1,
          newText: '',
        },
      });
    }
  }

  return insights;
}
