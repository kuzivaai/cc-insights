# cc-insights

Actionable intelligence library for Claude Code. Monorepo with `@ccinsights/core` (npm library) and `cc-insights` (VS Code extension).

## Commands

```bash
pnpm test          # Run all tests
pnpm build         # Build all packages
pnpm typecheck     # TypeScript type checking
```

## Verification

```bash
pnpm typecheck && pnpm test && pnpm build
```

## Architecture

- `packages/core/` — Pure TypeScript insight engine. Zero runtime deps.
- `packages/vscode/` — VS Code extension consuming core.
- Rules are async functions: `(project, ctx) => Promise<Insight[]>`
- `RuleContext` injects filesystem access for testability.

## Conventions

- TypeScript strict mode, no `any`
- TDD: write failing test, implement, verify
- British English in all copy
