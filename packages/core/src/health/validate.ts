import type { RuleContext, StaleReference } from '../types.js';
import type { FileReference, CommandReference } from './references.js';

export async function validateFileReferences(
  refs: FileReference[],
  ctx: RuleContext,
): Promise<StaleReference[]> {
  const stale: StaleReference[] = [];

  for (const ref of refs) {
    const resolved = ctx.resolvePath(ref.reference);
    const exists = await ctx.fileExists(resolved);
    if (!exists) {
      stale.push({
        reference: ref.reference,
        line: ref.line,
        section: '',
        type: 'file',
      });
    }
  }

  return stale;
}

export async function validateCommandReferences(
  refs: CommandReference[],
  ctx: RuleContext,
): Promise<StaleReference[]> {
  const validatable = refs.filter(r => r.manager !== 'npx');
  if (validatable.length === 0) return [];

  const pkgPath = ctx.resolvePath('package.json');
  const pkgContent = await ctx.readFile(pkgPath);
  if (!pkgContent) return [];

  let scripts: Record<string, string> = {};
  try {
    const pkg = JSON.parse(pkgContent);
    scripts = pkg.scripts || {};
  } catch {
    return [];
  }

  const stale: StaleReference[] = [];

  for (const ref of validatable) {
    if (!(ref.script in scripts)) {
      stale.push({
        reference: ref.raw,
        line: ref.line,
        section: '',
        type: 'command',
      });
    }
  }

  return stale;
}
