# cc-insights — Actionable intelligence for Claude Code

Analyses your CLAUDE.md files and Claude Code session history to surface prescriptive
fixes — not just metrics. Detects stale file references, missing build commands, bloat,
and recurring tool failures. Ships as an npm library and a VS Code extension.

## Install

**Library**
```bash
npm install @cc-insights/core
```

**VS Code extension** — search "CC Insights" in the Extensions marketplace.

## Library usage

```typescript
import { analyse } from '@cc-insights/core';

const result = await analyse({ claudeDir: '~/.claude' });
console.log(result.insights);
```

## VS Code extension

Open any CLAUDE.md file. Stale file and command references get squiggly underlines.
Press `Ctrl+.` (or `Cmd+.` on macOS) on an underlined item for quick-fix suggestions.

## Rules

| ID | Detects |
|----|---------|
| `missing-claudemd` | Project has no CLAUDE.md — Claude has no project-specific instructions |
| `thin-claudemd` | CLAUDE.md is too short to give Claude useful context |
| `claudemd-bloat` | CLAUDE.md exceeds token budget — Claude reads the whole file every turn |
| `missing-build-cmd` | No build, test, or lint commands — Claude cannot verify its own changes |
| `stale-file-ref` | A referenced file path no longer exists on disk |
| `stale-command-ref` | A referenced npm script is not present in package.json |
| `false-starts` | Cluster of very short sessions suggesting repeated context loss |
| `tool-error-pattern` | A tool is failing at a high rate with a recurring error category |

## Privacy

No telemetry. No network calls. All analysis runs locally against files on your machine.

## Licence

MIT
