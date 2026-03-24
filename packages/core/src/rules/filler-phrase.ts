import type { Insight, ProjectData, RuleContext } from '../types.js';

const FILLER_PREFIXES = [
  'always remember to',
  'make sure to',
  'please make sure to',
  'be sure to',
  'please ensure that',
  'ensure that you',
  'it is important to',
  "it's important to",
  'you should always',
  'you must always',
  'please always',
  'remember to always',
  "don't forget to",
  'keep in mind that',
  'note that you should',
  'be careful to',
  'take care to',
];

export async function fillerPhrase(project: ProjectData, _ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent) return [];

  const lines = project.claudeMdContent.split('\n');
  const insights: Insight[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;

    // Strip list markers
    const listMatch = line.match(/^(\s*[-*]\s+|\s*\d+\.\s+)(.*)/);
    const prefix = listMatch ? listMatch[1] : '';
    const content = listMatch ? listMatch[2] : line.trimStart();
    const leadingWhitespace = listMatch ? '' : line.slice(0, line.length - line.trimStart().length);

    const contentLower = content.toLowerCase();
    for (const filler of FILLER_PREFIXES) {
      if (contentLower.startsWith(filler)) {
        const remainder = content.slice(filler.length).trimStart();
        const capitalised = remainder.charAt(0).toUpperCase() + remainder.slice(1);
        const newLine = leadingWhitespace + prefix + capitalised;

        insights.push({
          rule: 'filler-phrase',
          severity: 'warning',
          category: 'claudemd',
          file: project.claudeMdPath,
          line: i + 1,
          message: `Filler phrase "${filler}" adds tokens without meaning`,
          suggestedFix: `Rewrite to: "${capitalised}"`,
          evidence: { filler, original: line.trim(), rewritten: newLine.trim() },
          fix: {
            description: `Rewrite to "${capitalised}"`,
            startLine: i + 1,
            endLine: i + 1,
            newText: newLine,
          },
        });
        break; // Only match first filler per line
      }
    }
  }

  return insights;
}
