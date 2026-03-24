import type { Insight, ProjectData, RuleContext } from '../types.js';
import { parseClaudeMdSections } from '../health/sections.js';

export async function noStructure(project: ProjectData, _ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent) return [];

  const sections = parseClaudeMdSections(project.claudeMdContent);

  if (sections.length === 1 && sections[0].heading === '(no heading)') {
    const lines = project.claudeMdContent.split('\n');
    return [{
      rule: 'no-structure',
      severity: 'warning',
      category: 'claudemd',
      file: project.claudeMdPath,
      line: 1,
      message: 'CLAUDE.md has no headings. Add section headers so Claude can locate relevant context.',
      suggestedFix: 'Add a heading at the top of the file',
      evidence: { totalLines: lines.length },
      fix: {
        description: `Add "# ${project.name}" heading`,
        startLine: 1,
        endLine: 1,
        newText: `# ${project.name}\n\n${lines[0]}`,
      },
    }];
  }

  return [];
}
