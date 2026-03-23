# cc-insights — Current State Brief

**Date**: 2026-03-23
**Purpose**: Factual snapshot for strategic planning. No aspirational language.

---

## What This Project Is

A linter for CLAUDE.md files and Claude Code sessions, shipped as an npm library (`@ccinsights/core`) and a VS Code extension (`cc-insights`). Extracted from the Hangar dashboard's insight engine.

**Tech stack**: TypeScript, Vitest, tsup, pnpm monorepo. Zero runtime dependencies in core. VS Code extension uses esbuild.

**Deployment status**:
- `@ccinsights/core@0.1.0` published to npm (2026-03-23). One version. Zero dependencies.
- VS Code extension: not confirmed on marketplace. Built but publish status unknown.
- No hosted service. Everything runs locally.

---

## What It Does

### Core library

Public API: `analyse({ claudeDir })` or `analyse({ projects })`. Returns `Insight[]` and `HealthReport[]`.

Parses `~/.claude/projects/` JSONL session files. Analyses CLAUDE.md content for quality issues. All rules are async functions with injected filesystem context for testability.

### Rules actually implemented (8 rules, all in `packages/core/src/rules/`)

| Rule | File | What it does |
|---|---|---|
| `stale-file-ref` | `stale-file-ref.ts` | File path in CLAUDE.md that does not exist on disk |
| `stale-command-ref` | `stale-command-ref.ts` | npm script referenced in CLAUDE.md but missing from package.json |
| `claudemd-bloat` | `claudemd-bloat.ts` | CLAUDE.md over 300 lines or 1800 tokens |
| `thin-claudemd` | `thin-claudemd.ts` | CLAUDE.md under 10 lines |
| `missing-claudemd` | `missing-claudemd.ts` | Project with sessions but no CLAUDE.md |
| `missing-build-cmd` | `missing-build-cmd.ts` | No build/test/lint commands in CLAUDE.md |
| `tool-error-pattern` | `tool-error-pattern.ts` | A tool failing at a high rate across sessions |
| `false-starts` | `false-starts.ts` | Multiple very short sessions on the same day |

All 8 rules are registered in `ALL_RULES` in `packages/core/src/rules/index.ts`.

### Additional core capabilities

- CLAUDE.md section parser with token estimation (`packages/core/src/health/sections.ts`)
- File and command reference extraction with line-level tracking (`packages/core/src/health/references.ts`)
- Reference validation against filesystem (`packages/core/src/health/validate.ts`)
- JSONL session parser with tool call and error extraction (`packages/core/src/parser/`)
- Configurable thresholds via `Thresholds` interface

### VS Code extension

- Diagnostics provider: underlines stale references in CLAUDE.md files
- Quick-fix code actions via `Ctrl+.` / `Cmd+.`
- One command: `cc-insights.analyse`
- Activates on `workspaceContains:**/CLAUDE.md` or `workspaceContains:**/.claude`
- Source files: 3 TypeScript files in `packages/vscode/src/`

---

## Current Scale

- **Source files**: 20 TypeScript files in `packages/core/src/`, 3 in `packages/vscode/src/`
- **Test files**: 15 test files in `packages/core/test/`, 71 tests, all passing
- **npm downloads**: Unknown -- published less than 1 day ago (2026-03-23)
- **VS Code installs**: Unknown -- marketplace publish status not confirmed
- **Revenue**: None. MIT-licensed, no monetisation
- **Git history**: 14 commits, single contributor, all on `main` branch

---

## Existing Strategic Documents

### `docs/specs/2026-03-23-v0.2-autofix-linter.md`

**Title**: "cc-insights v0.2: Every Warning Has a Fix"
**Status**: Draft
**Key decisions**:
- Cut 3 rules from default set: `thin-claudemd`, `false-starts`, `tool-error-pattern` (session analysis is not the product; CLAUDE.md linting is)
- Rewrite `missing-build-cmd` regex (current one matches the word "run" in prose)
- Add 8 new rules: `stale-import`, `default-behavior`, `filler-phrase`, `redundant-config`, `non-md-import`, `no-structure`, `settings-in-claudemd`, `position-risk`
- Add auto-fix capability (`InsightFix` type) for Tier 1 and 2 rules
- Add inline suppression via `<!-- cc-insights-disable rule-id -->` comments
- VS Code: fix-on-save setting, "Fix all" command
- Version bump: 0.1.0 to 0.2.0

**Targets stated in v0.2 spec**:
- 3-7 findings on a typical CLAUDE.md on first run
- Under 200ms analysis time for 500-line files
- Kill criteria: <20 installs and no external engagement after 4 weeks

### Origin design spec (in Hangar repo, not in this repo)

Located at `/mnt/c/Users/mkuzi/OneDrive/Documents/Hangar/docs/superpowers/specs/2026-03-22-cc-insights-design.md`. Contains the original architecture decisions, competitive analysis, and implementation plan.

**Milestones stated in origin spec**:
- v1.0: >10 npm weekly downloads and >5 VS Code installs
- v1.1: >50 VS Code installs, >3 positive reviews or GitHub issues

---

## Stated Differentiation

Per README and specs:
- "No telemetry. No network calls. Everything runs locally."
- Zero runtime dependencies in core
- Positioned as "the Prettier of CLAUDE.md" (v0.2 spec) -- auto-fix rather than just warn
- Claims the competitive gap is that no existing tool auto-fixes its findings (v0.2 spec names cclint, AgentLinter, agnix as competitors with 11-53+ rules but no auto-fix)
- Library-first design: intended for consumption by other tools (VS Code extension is one consumer)

**Constraints and dependencies**:
- Depends on `~/.claude/projects/` JSONL file format (Anthropic's undocumented internal format)
- No plugin system or extension API
- Single-contributor project

---

## Known Issues

### 1. `SessionData.errors` is always empty

In `packages/core/src/parser/sessions.ts`, line 134: `errors: []` is hardcoded. The `ErrorEvent[]` array is never populated. Tool errors are extracted into `toolCalls` (with `success: false`, `errorMessage`, and `errorCategory`), but the separate `errors` field on `SessionData` is always an empty array. The `tool-error-pattern` rule works around this by reading from `toolCalls` instead.

### 2. `missing-build-cmd` regex is too loose

In `packages/core/src/rules/missing-build-cmd.ts`, line 3: the pattern `/\b(build|test|lint|dev|start|run)\b/i` matches the word "run" or "test" appearing anywhere in prose, not just in actual command invocations. A CLAUDE.md saying "run the linter manually" would pass the check even if it contains no actual commands. The v0.2 spec acknowledges this and plans a rewrite.

### 3. `StaleReference.section` is always empty in rule path

In `packages/core/src/health/validate.ts`, lines 17 and 52: `section: ''` is hardcoded when creating `StaleReference` objects. The `analyseClaudeMdHealth` function in `health/index.ts` enriches these with section context after the fact, but the `stale-file-ref` and `stale-command-ref` rules call `validateFileReferences` and `validateCommandReferences` directly, so the `section` field is always empty string when insights are generated through rules.

### 4. No TODOs or FIXMEs in codebase

A grep for `TODO`, `FIXME`, `HACK`, and `XXX` across all source files returned zero matches.
