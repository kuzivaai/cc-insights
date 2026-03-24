# cc-insights

Linter for CLAUDE.md files. Finds stale references, bloat, filler phrases, and missing commands. Auto-fixes everything it warns about.

Ships as an npm library (`@ccinsights/core`), a CLI, and a VS Code extension.

## CLI

```bash
npx @ccinsights/core CLAUDE.md              # Lint
npx @ccinsights/core CLAUDE.md --fix        # Lint and fix
npx @ccinsights/core CLAUDE.md --fix --dry-run  # Preview fixes
```

## Install

**Library:**
```bash
npm install @ccinsights/core
```

**VS Code:** search "CC Insights" in the Extensions marketplace.

## Library Usage

```typescript
import { analyse, applyFixes } from '@ccinsights/core';

const result = await analyse({ claudeDir: '~/.claude' });
console.log(result.insights);

// Auto-fix
const fixed = applyFixes(content, result.insights);
```

## Rules (12)

| Rule | Severity | Auto-Fix |
|------|----------|----------|
| `stale-file-ref` | warning | Delete line |
| `stale-command-ref` | warning | Delete line |
| `stale-import` | warning | Delete line |
| `missing-build-cmd` | warning | Append commands section |
| `filler-phrase` | warning | Rewrite to direct form |
| `no-structure` | warning | Add heading |
| `redundant-config` | warning | Delete line |
| `missing-claudemd` | warning | Generate scaffold |
| `claudemd-bloat` | info | -- |
| `thin-claudemd` | info | -- |
| `tool-error-pattern` | info | -- |
| `false-starts` | info | -- |

All thresholds are configurable via `analyse({ thresholds: { ... } })`.

## Suppression

Disable a rule for a specific line with an inline comment:

```markdown
<!-- cc-insights-disable stale-file-ref -->
`src/legacy.ts` is intentionally referenced.
<!-- cc-insights-enable stale-file-ref -->
```

## VS Code Extension

Open a CLAUDE.md file. Warnings appear inline. `Ctrl+.` / `Cmd+.` for quick-fixes.

- **Fix All** command: `CC Insights: Fix All`
- **Fix on save**: enable `ccInsights.fixOnSave` in settings

## Privacy

No telemetry. No network calls. Everything runs locally.

## Licence

MIT
