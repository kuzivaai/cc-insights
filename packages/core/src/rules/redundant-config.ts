import type { Insight, ProjectData, RuleContext } from '../types.js';

export async function redundantConfig(project: ProjectData, ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent || !project.projectCwd) return [];

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

  if (Object.keys(scripts).length === 0) return [];

  const lines = project.claudeMdContent.split('\n');
  const insights: Insight[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }

    for (const [name] of Object.entries(scripts)) {
      const patterns = [
        `npm run ${name}`,
        `pnpm run ${name}`,
        `yarn run ${name}`,
        `pnpm ${name}`,
        `yarn ${name}`,
      ];
      if (['test', 'start', 'build', 'stop'].includes(name)) {
        patterns.push(`npm ${name}`);
      }

      let matched = false;
      for (const pattern of patterns) {
        const cleaned = trimmed
          .replace(/^[`$#>\s]+/, '')
          .replace(/[`\s]+$/, '');

        if (cleaned === pattern) {
          insights.push({
            rule: 'redundant-config',
            severity: 'warning',
            category: 'claudemd',
            file: project.claudeMdPath,
            line: i + 1,
            message: `"${pattern}" is already in package.json. Claude reads package.json directly.`,
            suggestedFix: `Remove this line. Claude can find "${name}" in package.json.`,
            evidence: { command: pattern, scriptName: name, scriptValue: scripts[name] },
            fix: {
              description: `Remove redundant "${pattern}"`,
              startLine: i + 1,
              endLine: i + 1,
              newText: '',
            },
          });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  return insights;
}
