# Changelog

## 0.3.0

### Added
- CLI: `npx @ccinsights/core CLAUDE.md [--fix] [--fix --dry-run]`
- Rule: `filler-phrase` — detects and auto-fixes padding phrases
- Rule: `stale-import` — detects broken @file imports
- Rule: `no-structure` — detects files with no markdown headings
- Rule: `redundant-config` — detects lines that restate package.json scripts
- Auto-fix on every warning-level rule
- `applyFixes()` function for programmatic fix application
- Inline suppression via `<!-- cc-insights-disable rule-id -->` comments
- VS Code: "Fix All" command
- VS Code: `ccInsights.fixOnSave` setting

### Changed
- `missing-build-cmd` rewritten to detect actual commands, not bare words
- `claudemd-bloat`, `thin-claudemd`, `tool-error-pattern`, `false-starts` demoted to info severity
- VS Code extension uses core library directly instead of duplicating rule logic

### Fixed
- `SessionData.errors` always empty (removed unused field)
- `StaleReference.section` always empty in rules path
- `missing-build-cmd` matching prose words like "run" and "test"

### Removed
- `ErrorEvent` type (was unused)

## 0.1.0

- Initial release
- 8 rules: stale-file-ref, stale-command-ref, claudemd-bloat, thin-claudemd, missing-claudemd, missing-build-cmd, tool-error-pattern, false-starts
- CLAUDE.md health analysis with section parsing and token estimation
- JSONL session parser
- VS Code extension with diagnostics and quick-fixes
