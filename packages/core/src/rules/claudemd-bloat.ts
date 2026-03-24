import type { Insight, ProjectData, RuleContext } from '../types.js';
import { parseClaudeMdSections } from '../health/sections.js';

export async function claudemdBloat(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent) return [];

  const lines = project.claudeMdContent.split('\n');
  const lineCount = lines.length;
  const sections = parseClaudeMdSections(project.claudeMdContent);
  const totalTokens = sections.reduce((sum, s) => sum + s.estimatedTokens, 0);

  const overLines = lineCount > ctx.thresholds.claudemdBloatLines;
  const overTokens = totalTokens > ctx.thresholds.claudemdBloatTokens;

  if (!overLines && !overTokens) return [];

  const topSections = [...sections]
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
    .slice(0, 5)
    .map(s => ({ heading: s.heading, estimatedTokens: s.estimatedTokens, lines: s.endLine - s.startLine + 1 }));

  return [
    {
      rule: 'claudemd-bloat',
      severity: 'info',
      category: 'claudemd',
      file: project.claudeMdPath,
      message: `CLAUDE.md is too long (${lineCount} lines, ~${totalTokens} tokens) — Claude reads the whole file every turn`,
      suggestedFix: 'Remove stale sections, move reference material to linked files, or split into per-directory CLAUDE.md files',
      evidence: { lines: lineCount, tokens: totalTokens, topSections },
    },
  ];
}
