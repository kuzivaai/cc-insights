import type { Insight, ProjectData, RuleContext } from '../types.js';
import { extractFileReferences } from '../health/references.js';
import { validateFileReferences } from '../health/validate.js';
import { parseClaudeMdSections } from '../health/sections.js';

export async function staleFileRef(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent || !project.projectCwd) return [];
  const fileRefs = extractFileReferences(project.claudeMdContent);
  const stale = await validateFileReferences(fileRefs, ctx);

  // Enrich with section context
  const sections = parseClaudeMdSections(project.claudeMdContent);
  for (const ref of stale) {
    const section = sections.find(s => ref.line >= s.startLine && ref.line <= s.endLine);
    ref.section = section?.heading || 'unknown';
  }

  return stale.map(ref => ({
    rule: 'stale-file-ref',
    severity: 'warning' as const,
    category: 'claudemd' as const,
    file: project.claudeMdPath,
    line: ref.line,
    message: `Stale reference to \`${ref.reference}\` in "${ref.section}" — file not found`,
    suggestedFix: `Remove or update the reference to \`${ref.reference}\` at line ${ref.line}`,
    fix: { description: 'Remove stale reference', startLine: ref.line, endLine: ref.line, newText: '' },
    evidence: { reference: ref.reference, line: ref.line, section: ref.section },
  }));
}
