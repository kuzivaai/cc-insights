# cc-insights

Linter for CLAUDE.md files and Claude Code sessions. Finds stale references, bloat, missing commands, and tool failure patterns.

Ships as an npm library (`@ccinsights/core`) and a VS Code extension.

## Install

**Library:**
```bash
npm install @ccinsights/core
```

**VS Code:** search "CC Insights" in the Extensions marketplace.

## Library usage

```typescript
import { analyse } from '@ccinsights/core';

const result = await analyse({ claudeDir: '~/.claude' });
console.log(result.insights);
```

Each insight includes a `rule`, `severity`, `file`, `line`, and `suggestedFix`. Pass your own data instead of a directory path if you already have parsed sessions:

```typescript
const result = await analyse({ projects: myParsedData });
```

## VS Code extension

Open a CLAUDE.md file. Stale file and command references get underlined. Press `Ctrl+.` (or `Cmd+.`) on a warning for quick-fix options.

## Rules

| Rule | What it finds |
|------|---------------|
| `stale-file-ref` | File path in CLAUDE.md that no longer exists on disk |
| `stale-command-ref` | npm script referenced in CLAUDE.md but missing from package.json |
| `claudemd-bloat` | CLAUDE.md over 300 lines or 1800 tokens |
| `thin-claudemd` | CLAUDE.md under 10 lines |
| `missing-claudemd` | Project with sessions but no CLAUDE.md |
| `missing-build-cmd` | No build/test/lint commands in CLAUDE.md |
| `tool-error-pattern` | A tool failing at a high rate across sessions |
| `false-starts` | Multiple very short sessions on the same day |

All thresholds are configurable via `analyse({ thresholds: { ... } })`.

## Privacy

No telemetry. No network calls. Everything runs locally.

## Licence

MIT
