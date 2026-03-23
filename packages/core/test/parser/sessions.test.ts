import { describe, it, expect } from 'vitest';
import { categoriseError, aggregateSession } from '../../src/parser/sessions.js';

describe('categoriseError', () => {
  it('categorises exit code errors', () => {
    expect(categoriseError('Process exited with exit code 1')).toBe('command-failed');
  });
  it('categorises file not found', () => {
    expect(categoriseError('ENOENT: no such file or directory')).toBe('file-not-found');
  });
  it('categorises edit string not found', () => {
    expect(categoriseError('The string to replace not found in file')).toBe('edit-string-not-found');
  });
  it('categorises permission denied', () => {
    expect(categoriseError('EACCES: permission denied')).toBe('permission-denied');
  });
  it('categorises timeout', () => {
    expect(categoriseError('Command timed out after 120s')).toBe('timeout');
  });
  it('categorises write before read', () => {
    expect(categoriseError('File has not been read yet, read it first')).toBe('write-before-read');
  });
  it('returns other for unknown errors', () => {
    expect(categoriseError('Something unexpected happened')).toBe('other');
  });
});

describe('aggregateSession', () => {
  it('returns null when no timestamps found', () => {
    const result = aggregateSession('test.jsonl', [{ type: 'user' }]);
    expect(result).toBeNull();
  });

  it('extracts tool calls from assistant messages', () => {
    const entries = [
      { type: 'assistant', timestamp: '2026-01-01T00:00:00Z', message: { content: [{ type: 'tool_use', name: 'Read', id: 'tu_1' }] } },
      { type: 'user', timestamp: '2026-01-01T00:01:00Z', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_1' }] } },
    ];
    const result = aggregateSession('test.jsonl', entries);
    expect(result).not.toBeNull();
    expect(result!.toolCalls).toHaveLength(1);
    expect(result!.toolCalls[0].tool).toBe('Read');
    expect(result!.toolCalls[0].success).toBe(true);
  });

  it('marks tool calls as failed when is_error is set', () => {
    const entries = [
      { type: 'assistant', timestamp: '2026-01-01T00:00:00Z', message: { content: [{ type: 'tool_use', name: 'Bash', id: 'tu_1' }] } },
      { type: 'user', timestamp: '2026-01-01T00:01:00Z', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_1', is_error: true, content: 'Process exited with exit code 1' }] } },
    ];
    const result = aggregateSession('test.jsonl', entries);
    expect(result!.toolCalls[0].success).toBe(false);
    expect(result!.toolCalls[0].errorCategory).toBe('command-failed');
  });
});
