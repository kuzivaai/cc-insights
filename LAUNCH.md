# Launch Plan

## What to publish where

### 1. VS Code Marketplace (do this first)

You need a publisher account. Go to https://marketplace.visualstudio.com/manage and create one with publisher ID `kuzivaai`.

Then:
```bash
cd ~/projects/cc-insights/packages/vscode
npx @vscode/vsce publish
```

### 2. Reddit post (r/ClaudeAI or r/ChatGPTPro)

Title: `I built a linter for CLAUDE.md files — finds stale references and auto-fixes them`

Body:

---

I kept running into a problem where my CLAUDE.md referenced files I'd renamed or npm scripts I'd removed. Claude would read the stale instructions every session and waste tokens trying to follow them.

So I built cc-insights — a linter that checks your CLAUDE.md for:

- File paths that no longer exist on disk
- npm scripts that aren't in package.json
- @imports pointing to missing files
- Filler phrases ("always remember to..." → just the instruction)
- Commands section that's actually just restating package.json

Every warning has an auto-fix. Run it once:

```
npx @ccinsights/core ./CLAUDE.md --fix
```

Or install the VS Code extension ("CC Insights") for inline warnings with one-click fixes.

12 rules, zero config, no telemetry, no network calls. Everything runs locally.

GitHub: https://github.com/kuzivaai/cc-insights
npm: https://www.npmjs.com/package/@ccinsights/core

---

### 3. Hacker News (Show HN)

Title: `Show HN: cc-insights – Linter for CLAUDE.md files with auto-fix`

Body: Same as Reddit but shorter. HN likes concise.

---

### 4. Claude Code community

Post in any Claude Code Discord/Slack/forum. The people most likely to care are already there.

## What NOT to do

- Don't write a blog post (nobody reads developer blog posts from unknowns)
- Don't make a landing page (overkill for a CLI tool)
- Don't buy ads (absurd for a free tool)
- Don't post to Twitter/X unless you have an existing audience there
