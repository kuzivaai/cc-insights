import { describe, it, expect } from 'vitest';
import { parseJsonlContent } from '../../src/parser/jsonl.js';

describe('parseJsonlContent', () => {
  it('parses valid JSONL lines', () => {
    const content = '{"type":"user","timestamp":"2026-01-01T00:00:00Z"}\n{"type":"assistant","timestamp":"2026-01-01T00:01:00Z"}';
    const result = parseJsonlContent(content);
    expect(result.entries).toHaveLength(2);
    expect(result.parseErrors).toBe(0);
  });

  it('skips malformed lines and counts errors', () => {
    const content = '{"valid": true}\nnot json at all\n{"also": "valid"}';
    const result = parseJsonlContent(content);
    expect(result.entries).toHaveLength(2);
    expect(result.parseErrors).toBe(1);
  });

  it('skips empty lines', () => {
    const content = '{"a":1}\n\n\n{"b":2}\n';
    const result = parseJsonlContent(content);
    expect(result.entries).toHaveLength(2);
    expect(result.parseErrors).toBe(0);
  });
});
