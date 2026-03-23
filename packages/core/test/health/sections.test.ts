import { describe, it, expect } from 'vitest';
import { parseClaudeMdSections } from '../../src/health/sections.js';

describe('parseClaudeMdSections', () => {
  it('extracts headings with line ranges and token estimates', () => {
    const content = `# Title\n\nSome intro text.\n\n## Commands\n\nnpm run build\nnpm run test\n\n## Architecture\n\nExpress server.`;
    const sections = parseClaudeMdSections(content);

    expect(sections).toHaveLength(3);
    expect(sections[0].heading).toBe('Title');
    expect(sections[0].level).toBe(1);
    expect(sections[0].startLine).toBe(1);
    expect(sections[1].heading).toBe('Commands');
    expect(sections[1].level).toBe(2);
    expect(sections[2].heading).toBe('Architecture');
    expect(sections[2].estimatedTokens).toBeGreaterThan(0);
  });

  it('treats content with no headings as a single section', () => {
    const content = 'Just some text\nwith no headings.';
    const sections = parseClaudeMdSections(content);

    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('(no heading)');
    expect(sections[0].level).toBe(0);
    expect(sections[0].startLine).toBe(1);
  });

  it('returns empty array for empty content', () => {
    expect(parseClaudeMdSections('')).toEqual([]);
  });

  it('uses 1-indexed line numbers', () => {
    const content = `# First\n\nText\n\n## Second\n\nMore text`;
    const sections = parseClaudeMdSections(content);

    expect(sections[0].startLine).toBe(1);
    expect(sections[1].startLine).toBe(5);
  });
});
