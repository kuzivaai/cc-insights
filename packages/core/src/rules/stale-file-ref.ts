import type { Insight, ProjectData, RuleContext } from '../types.js';
import { extractFileReferences } from '../health/references.js';
import { validateFileReferences } from '../health/validate.js';

export async function staleFileRef(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent || !project.projectCwd) return [];
  const fileRefs = extractFileReferences(project.claudeMdContent);
  const stale = await validateFileReferences(fileRefs, ctx);
  return stale.map(ref => ({
    rule: 'stale-file-ref',
    severity: 'warning' as const,
    category: 'claudemd' as const,
    file: project.claudeMdPath,
    line: ref.line,
    message: `Stale reference to \`${ref.reference}\` — file not found`,
    suggestedFix: `Remove or update the reference to \`${ref.reference}\` at line ${ref.line}`,
    evidence: { reference: ref.reference, line: ref.line },
  }));
}
