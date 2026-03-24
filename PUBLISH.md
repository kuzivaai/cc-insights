# Publishing cc-insights

## Prerequisites

- npm account with publish access to @ccinsights scope
- VS Code marketplace publisher account (publisher: kuzivaai)

## npm (@ccinsights/core)

```bash
cd ~/projects/cc-insights/packages/core
pnpm build
npm publish --access public
```

## VS Code Extension

```bash
cd ~/projects/cc-insights/packages/vscode
pnpm build
npx @vscode/vsce package
npx @vscode/vsce publish
```

## Verify

```bash
npm view @ccinsights/core version  # Should show 0.3.0
npx @ccinsights/core ./CLAUDE.md   # Should lint the file
```
