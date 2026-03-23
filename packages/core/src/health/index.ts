import type { HealthReport, RuleContext } from '../types.js';
import { parseClaudeMdSections } from './sections.js';
import { extractFileReferences, extractCommandReferences } from './references.js';
import { validateFileReferences, validateCommandReferences } from './validate.js';

export async function analyseClaudeMdHealth(
  projectName: string,
  claudeMdPath: string,
  claudeMdContent: string,
  ctx: RuleContext,
): Promise<HealthReport> {
  const sections = parseClaudeMdSections(claudeMdContent);
  const totalTokens = sections.reduce((sum, s) => sum + s.estimatedTokens, 0);
  const lines = claudeMdContent.split('\n');

  const fileRefs = extractFileReferences(claudeMdContent);
  const cmdRefs = extractCommandReferences(claudeMdContent);

  const staleFileRefs = await validateFileReferences(fileRefs, ctx);
  const staleCommandRefs = await validateCommandReferences(cmdRefs, ctx);

  // Enrich stale refs with section context
  for (const ref of [...staleFileRefs, ...staleCommandRefs]) {
    const section = sections.find(
      s => ref.line >= s.startLine && ref.line <= s.endLine,
    );
    ref.section = section?.heading || 'unknown';
  }

  return {
    project: projectName,
    claudeMdPath,
    totalLines: lines.length,
    estimatedTokens: totalTokens,
    sections,
    staleFileRefs,
    staleCommandRefs,
  };
}

export { parseClaudeMdSections } from './sections.js';
export { extractFileReferences, extractCommandReferences } from './references.js';
