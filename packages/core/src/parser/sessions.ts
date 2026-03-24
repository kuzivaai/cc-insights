import type { SessionData, ToolCall, ErrorCategory } from '../types.js';
import type { JsonlEntry } from './jsonl.js';

export function categoriseError(text: string): ErrorCategory {
  const lower = text.toLowerCase();
  if (lower.includes('exit code')) return 'command-failed';
  if (lower.includes('not found in file') || lower.includes('string to replace not found')) return 'edit-string-not-found';
  if (lower.includes('not been read') || lower.includes('read it first')) return 'write-before-read';
  if (lower.includes('does not exist') || lower.includes('no such file') || lower.includes('not found')) return 'file-not-found';
  if (lower.includes('permission') || lower.includes('denied') || lower.includes('eacces')) return 'permission-denied';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  return 'other';
}

function cleanToolName(name: string): string {
  if (name.startsWith('mcp__')) {
    const parts = name.replace('mcp__', '').split('__');
    const server = parts[0]?.replace('plugin_', '').split('_').pop() || parts[0];
    const method = parts.slice(1).join('.');
    return method ? `${server}:${method}` : server || name;
  }
  return name;
}

export function aggregateSession(filename: string, entries: JsonlEntry[]): SessionData | null {
  const toolCalls: ToolCall[] = [];
  const toolIdMap = new Map<string, string>();
  let firstTimestamp: Date | null = null;
  let lastTimestamp: Date | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let model = 'unknown';

  for (const entry of entries) {
    // Track timestamps
    if (entry.timestamp) {
      const ts = new Date(entry.timestamp);
      if (!isNaN(ts.getTime())) {
        if (!firstTimestamp) firstTimestamp = ts;
        lastTimestamp = ts;
      }
    }

    // Extract tool_use from assistant messages
    if (entry.type === 'assistant' && entry.message?.content) {
      const content = Array.isArray(entry.message.content) ? entry.message.content : [];
      for (const block of content) {
        if (block && typeof block === 'object' && 'type' in block && (block as Record<string, unknown>).type === 'tool_use') {
          const b = block as Record<string, unknown>;
          const name = cleanToolName(typeof b.name === 'string' ? b.name : 'unknown');
          const id = typeof b.id === 'string' ? b.id : undefined;
          if (id) toolIdMap.set(id, name);
          toolCalls.push({ tool: name, success: true }); // Assumed success until result
        }
      }
    }

    // Extract tool_result errors from user messages
    if (entry.type === 'user' && entry.message?.content) {
      const content = Array.isArray(entry.message.content) ? entry.message.content : [];
      for (const block of content) {
        if (
          block &&
          typeof block === 'object' &&
          'type' in block &&
          (block as Record<string, unknown>).type === 'tool_result' &&
          (block as Record<string, unknown>).is_error
        ) {
          const b = block as Record<string, unknown>;
          const toolId = typeof b.tool_use_id === 'string' ? b.tool_use_id : '';
          const toolName = toolIdMap.get(toolId) || 'unknown';

          let errorText = '';
          const blockContent = b.content;
          if (typeof blockContent === 'string') {
            errorText = blockContent;
          } else if (Array.isArray(blockContent)) {
            for (const rb of blockContent) {
              if (rb && typeof rb === 'object' && (rb as Record<string, unknown>).type === 'text') {
                const rbText = (rb as Record<string, unknown>).text;
                errorText = typeof rbText === 'string' ? rbText : '';
                break;
              }
            }
          }

          const category = categoriseError(errorText);

          // Find and update the matching tool call
          const matchingCall = toolCalls.find(tc => tc.tool === toolName && tc.success);
          if (matchingCall) {
            matchingCall.success = false;
            matchingCall.errorMessage = errorText.slice(0, 200);
            matchingCall.errorCategory = category;
          } else {
            toolCalls.push({ tool: toolName, success: false, errorMessage: errorText.slice(0, 200), errorCategory: category });
          }
        }
      }
    }

    // Extract usage from summary/result entries
    if (entry.result?.usage) {
      const u = entry.result.usage;
      inputTokens += u.input_tokens || 0;
      outputTokens += u.output_tokens || 0;
      cacheReadTokens += u.cache_read_input_tokens || 0;
      cacheCreationTokens += u.cache_creation_input_tokens || 0;
    }
    if (entry.result?.model) {
      model = entry.result.model;
    }
  }

  if (!firstTimestamp) return null; // No valid timestamps

  const totalTokens = inputTokens + outputTokens;
  const durationMinutes = lastTimestamp && firstTimestamp
    ? (lastTimestamp.getTime() - firstTimestamp.getTime()) / 60000
    : 0;

  return {
    file: filename,
    startTime: firstTimestamp,
    durationMinutes: Math.max(0, durationMinutes),
    totalTokens,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    toolCalls,
    model,
  };
}
