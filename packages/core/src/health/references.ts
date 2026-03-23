export interface FileReference {
  reference: string;
  line: number;
}

export interface CommandReference {
  manager: string;
  script: string;
  raw: string;
  line: number;
}

const FILE_EXTENSIONS = /\.(ts|tsx|js|jsx|json|md|yaml|yml|toml|sh|py|rs|go|css|html)$/;
const BUILTIN_COMMANDS = new Set(['install', 'init', 'publish', 'link', 'add', 'remove', 'i']);

export function extractFileReferences(content: string): FileReference[] {
  const refs: FileReference[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Backtick-wrapped paths
    const backtickMatches = line.matchAll(/`([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)`/g);
    for (const m of backtickMatches) {
      const p = m[1];
      if (p.includes('://')) continue;
      if (/^\d+\.\d+/.test(p)) continue;
      if (p.includes('/') || FILE_EXTENSIONS.test(p)) {
        refs.push({ reference: p, line: i + 1 });
      }
    }

    // Code block paths (lines that look like file paths)
    const codeBlockMatch = line.match(/^([a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|json|md|yaml|yml|toml|sh|py|rs|go|css|html))\s/);
    if (codeBlockMatch) {
      if (!refs.some(r => r.reference === codeBlockMatch[1] && r.line === i + 1)) {
        refs.push({ reference: codeBlockMatch[1], line: i + 1 });
      }
    }
  }

  return refs;
}

export function extractCommandReferences(content: string): CommandReference[] {
  const refs: CommandReference[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const npmMatches = line.matchAll(/\b(npm|pnpm|yarn)\s+(run\s+)?([a-zA-Z0-9:_-]+)/g);
    for (const m of npmMatches) {
      const script = m[3];
      if (BUILTIN_COMMANDS.has(script)) continue;
      refs.push({ manager: m[1], script, raw: m[0], line: i + 1 });
    }

    const npxMatches = line.matchAll(/\bnpx\s+([a-zA-Z0-9@/_-]+)/g);
    for (const m of npxMatches) {
      refs.push({ manager: 'npx', script: m[1], raw: m[0], line: i + 1 });
    }
  }

  return refs;
}
