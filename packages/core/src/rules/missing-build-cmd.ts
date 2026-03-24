import type { Insight, ProjectData, RuleContext } from '../types.js';

const COMMAND_PATTERNS = [
  /\b(npm|pnpm|yarn)\s+(run\s+)?[a-zA-Z0-9:_-]+/,  // npm run build, pnpm test
  /\bnpx\s+[a-zA-Z0-9@/_-]+/,                        // npx tsc
  /\bmake\s+[a-zA-Z0-9_-]+/,                          // make build
  /\bcargo\s+(build|test|check|clippy|run)/,           // cargo test
  /\bgo\s+(build|test|run|vet)/,                       // go test
  /\bpython\s+-m\s+pytest/,                            // python -m pytest
  /\bpip\s+install/,                                    // pip install
];

function hasActualCommands(content: string): boolean {
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Check inside code blocks
    if (inCodeBlock) {
      for (const pattern of COMMAND_PATTERNS) {
        if (pattern.test(line)) return true;
      }
      continue;
    }

    // Check backtick-wrapped commands outside code blocks
    const backtickContent = line.match(/`([^`]+)`/g);
    if (backtickContent) {
      for (const tick of backtickContent) {
        const inner = tick.slice(1, -1);
        for (const pattern of COMMAND_PATTERNS) {
          if (pattern.test(inner)) return true;
        }
      }
    }

    // Shell prompt lines
    if (/^\s*[\$>]\s+/.test(line)) {
      for (const pattern of COMMAND_PATTERNS) {
        if (pattern.test(line)) return true;
      }
    }
  }

  return false;
}

export async function missingBuildCmd(project: ProjectData, _ctx: RuleContext): Promise<Insight[]> {
  if (!project.claudeMdContent) return [];
  if (project.name === 'Home') return [];

  if (!hasActualCommands(project.claudeMdContent)) {
    const totalLines = project.claudeMdContent.split('\n').length;
    return [
      {
        rule: 'missing-build-cmd',
        severity: 'warning',
        category: 'claudemd',
        file: project.claudeMdPath,
        message: 'No build, test, or lint commands found. Add a Commands section so Claude can verify its work.',
        suggestedFix: 'Add a Commands section with actual build/test commands',
        fix: {
          description: 'Add commands section',
          startLine: totalLines + 1,
          endLine: totalLines + 1,
          newText: '\n## Commands\n\n```bash\n# Add your build/test commands here\n```\n',
        },
        evidence: {},
      },
    ];
  }

  return [];
}
