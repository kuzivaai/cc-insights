export interface JsonlEntry {
  type?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  // Summary entries have usage data
  result?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model?: string;
  };
  timestamp?: string;
  [key: string]: unknown;
}

export interface JsonlParseResult {
  entries: JsonlEntry[];
  parseErrors: number;
}

export function parseJsonlContent(content: string): JsonlParseResult {
  const entries: JsonlEntry[] = [];
  let parseErrors = 0;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      parseErrors++;
    }
  }

  return { entries, parseErrors };
}
