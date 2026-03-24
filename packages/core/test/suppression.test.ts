import { describe, it, expect } from 'vitest';
import { parseSuppressionsFromContent, isSuppressed } from '../src/suppression.js';

describe('parseSuppressionsFromContent', () => {
  it('parses file-level disable', () => {
    const content = '<!-- cc-insights-disable-file stale-file-ref -->\n# My CLAUDE.md';
    const suppressions = parseSuppressionsFromContent(content);
    expect(suppressions).toHaveLength(1);
    expect(suppressions[0]).toMatchObject({ rule: 'stale-file-ref', startLine: 1, endLine: Infinity });
  });

  it('parses block disable/enable', () => {
    const content = '# Title\n<!-- cc-insights-disable default-behavior -->\nwrite clean code\n<!-- cc-insights-enable default-behavior -->\nreal content';
    const suppressions = parseSuppressionsFromContent(content);
    expect(suppressions).toHaveLength(1);
    expect(suppressions[0]).toMatchObject({ rule: 'default-behavior', startLine: 2, endLine: 4 });
  });

  it('unclosed blocks suppress to end of file', () => {
    const content = '# Title\n<!-- cc-insights-disable stale-file-ref -->\nstuff';
    const suppressions = parseSuppressionsFromContent(content);
    expect(suppressions[0].endLine).toBe(Infinity);
  });
});

describe('isSuppressed', () => {
  it('returns true for suppressed lines', () => {
    const suppressions = [{ rule: 'stale-file-ref', startLine: 2, endLine: 5 }];
    expect(isSuppressed('stale-file-ref', 3, suppressions)).toBe(true);
    expect(isSuppressed('stale-file-ref', 1, suppressions)).toBe(false);
    expect(isSuppressed('stale-file-ref', 6, suppressions)).toBe(false);
    expect(isSuppressed('other-rule', 3, suppressions)).toBe(false);
  });
});
