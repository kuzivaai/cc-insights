import type { Section } from '../types.js';

export function parseClaudeMdSections(content: string): Section[] {
  if (!content.trim()) return [];

  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: { heading: string; level: number; startLine: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,4})\s+(.+)/);
    if (match) {
      if (current) {
        const sectionContent = lines.slice(current.startLine - 1, i).join('\n');
        sections.push({
          heading: current.heading,
          level: current.level,
          startLine: current.startLine,
          endLine: i,
          estimatedTokens: Math.ceil(sectionContent.length / 4),
        });
      }
      current = {
        heading: match[2].trim(),
        level: match[1].length,
        startLine: i + 1,
      };
    }
  }

  if (current) {
    const sectionContent = lines.slice(current.startLine - 1).join('\n');
    sections.push({
      heading: current.heading,
      level: current.level,
      startLine: current.startLine,
      endLine: lines.length,
      estimatedTokens: Math.ceil(sectionContent.length / 4),
    });
  }

  if (sections.length === 0) {
    sections.push({
      heading: '(no heading)',
      level: 0,
      startLine: 1,
      endLine: lines.length,
      estimatedTokens: Math.ceil(content.length / 4),
    });
  }

  return sections;
}
