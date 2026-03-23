import type { Insight, ProjectData, RuleContext } from '../types.js';
import { extractCommandReferences } from '../health/references.js';
import { validateCommandReferences } from '../health/validate.js';

export async function staleCommandRef(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent || !project.projectCwd) return [];
  const cmdRefs = extractCommandReferences(project.claudeMdContent);
  const stale = await validateCommandReferences(cmdRefs, ctx);
  return stale.map(ref => ({
    rule: 'stale-command-ref',
    severity: 'warning' as const,
    category: 'claudemd' as const,
    file: project.claudeMdPath,
    line: ref.line,
    message: `Stale command reference \`${ref.reference}\` — script not found in package.json`,
    suggestedFix: `Remove or update \`${ref.reference}\` at line ${ref.line}`,
    evidence: { reference: ref.reference, line: ref.line },
  }));
}
