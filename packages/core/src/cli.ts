import { readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { analyse, applyFixes } from './index.js';
import type { Insight } from './types.js';

const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const dryRun = args.includes('--dry-run');
const filePath = args.find(a => !a.startsWith('--'));

if (!filePath) {
  console.error('Usage: cc-insights <path/to/CLAUDE.md> [--fix] [--dry-run]');
  process.exit(1);
}

const absPath = resolve(filePath);
const projectCwd = dirname(absPath);

async function main() {
  let content: string;
  try {
    content = await readFile(absPath, 'utf-8');
  } catch {
    console.error(`Cannot read ${absPath}`);
    process.exit(1);
  }

  const result = await analyse({
    projects: [{
      path: projectCwd,
      projectCwd,
      name: basename(projectCwd),
      claudeMdContent: content,
      claudeMdPath: absPath,
      sessions: [],
    }],
  });

  if (result.insights.length === 0) {
    console.log('No issues found.');
    process.exit(0);
  }

  // Display insights
  for (const insight of result.insights) {
    const fixable = insight.fix ? ' [fixable]' : '';
    const line = insight.line ? `:${insight.line}` : '';
    const severity = insight.severity === 'warning' ? '\x1b[33mwarning\x1b[0m' : '\x1b[36minfo\x1b[0m';
    console.log(`  ${severity}  ${insight.rule}${line}  ${insight.message}${fixable}`);
  }

  const fixableCount = result.insights.filter(i => i.fix).length;
  const total = result.insights.length;
  console.log(`\n  ${total} issue${total !== 1 ? 's' : ''} (${fixableCount} fixable)\n`);

  // Apply fixes
  if (fixMode && fixableCount > 0) {
    const fixed = applyFixes(content, result.insights);
    if (dryRun) {
      console.log('--- dry run (would write): ---');
      console.log(fixed);
    } else {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(absPath, fixed, 'utf-8');
      console.log(`Fixed ${fixableCount} issue${fixableCount !== 1 ? 's' : ''} in ${filePath}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
