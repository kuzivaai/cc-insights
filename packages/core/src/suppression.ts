import type { Suppression } from './types.js';

export function parseSuppressionsFromContent(content: string): Suppression[] {
  const suppressions: Suppression[] = [];
  const lines = content.split('\n');
  const openBlocks = new Map<string, number>(); // rule -> startLine

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // File-level disable
    const fileMatch = line.match(/^<!--\s*cc-insights-disable-file\s+(\S+)\s*-->$/);
    if (fileMatch) {
      suppressions.push({ rule: fileMatch[1], startLine: 1, endLine: Infinity });
      continue;
    }

    // Block disable start
    const disableMatch = line.match(/^<!--\s*cc-insights-disable\s+(\S+)\s*-->$/);
    if (disableMatch) {
      openBlocks.set(disableMatch[1], lineNum);
      continue;
    }

    // Block enable (close)
    const enableMatch = line.match(/^<!--\s*cc-insights-enable\s+(\S+)\s*-->$/);
    if (enableMatch && openBlocks.has(enableMatch[1])) {
      const startLine = openBlocks.get(enableMatch[1])!;
      suppressions.push({ rule: enableMatch[1], startLine, endLine: lineNum });
      openBlocks.delete(enableMatch[1]);
      continue;
    }
  }

  // Unclosed blocks suppress to end of file
  for (const [rule, startLine] of openBlocks) {
    suppressions.push({ rule, startLine, endLine: Infinity });
  }

  return suppressions;
}

export function isSuppressed(rule: string, line: number, suppressions: Suppression[]): boolean {
  return suppressions.some(s => s.rule === rule && line >= s.startLine && line <= s.endLine);
}
