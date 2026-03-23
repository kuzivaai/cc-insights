import * as vscode from 'vscode';

// Import from the core library - these are workspace dependencies
// @ts-ignore - workspace link may not resolve at typecheck time in all configs
import { analyseClaudeMdHealth, createDefaultContext, DEFAULT_THRESHOLDS } from '@ccinsights/core';

let diagnosticCollection: vscode.DiagnosticCollection;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('cc-insights');
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => analyseIfClaudeMd(doc)),
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => analyseIfClaudeMd(doc)),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => analyseIfClaudeMd(event.document), 500);
    }),
  );

  for (const doc of vscode.workspace.textDocuments) {
    analyseIfClaudeMd(doc);
  }
}

function isClaudeMd(doc: vscode.TextDocument): boolean {
  return doc.fileName.toLowerCase().endsWith('claude.md');
}

async function analyseIfClaudeMd(doc: vscode.TextDocument): Promise<void> {
  if (!isClaudeMd(doc)) return;

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
  const projectCwd = workspaceFolder?.uri.fsPath || '';

  const ctx = createDefaultContext(projectCwd, DEFAULT_THRESHOLDS);
  const health = await analyseClaudeMdHealth(
    workspaceFolder?.name || 'unknown',
    doc.uri.fsPath,
    doc.getText(),
    ctx,
  );

  const diagnostics: vscode.Diagnostic[] = [];

  // Stale file references
  for (const ref of health.staleFileRefs) {
    const line = Math.max(0, ref.line - 1);
    const range = doc.lineAt(line).range;
    const diag = new vscode.Diagnostic(
      range,
      `Stale reference: \`${ref.reference}\` — file not found`,
      vscode.DiagnosticSeverity.Warning,
    );
    diag.code = 'stale-file-ref';
    diag.source = 'cc-insights';
    diagnostics.push(diag);
  }

  // Stale command references
  for (const ref of health.staleCommandRefs) {
    const line = Math.max(0, ref.line - 1);
    const range = doc.lineAt(line).range;
    const diag = new vscode.Diagnostic(
      range,
      `Stale reference: \`${ref.reference}\` — script not in package.json`,
      vscode.DiagnosticSeverity.Warning,
    );
    diag.code = 'stale-command-ref';
    diag.source = 'cc-insights';
    diagnostics.push(diag);
  }

  // Bloat warning (lines OR tokens)
  if (health.totalLines > DEFAULT_THRESHOLDS.claudemdBloatLines || health.estimatedTokens > DEFAULT_THRESHOLDS.claudemdBloatTokens) {
    const range = doc.lineAt(0).range;
    const topSection = [...health.sections].sort((a, b) => b.estimatedTokens - a.estimatedTokens)[0];
    const diag = new vscode.Diagnostic(
      range,
      `CLAUDE.md is ${health.totalLines} lines (~${health.estimatedTokens} tokens). Consider splitting with @imports. Largest section: "${topSection?.heading}" (${topSection?.estimatedTokens} tokens)`,
      vscode.DiagnosticSeverity.Warning,
    );
    diag.code = 'claudemd-bloat';
    diag.source = 'cc-insights';
    diagnostics.push(diag);
  }

  // Thin CLAUDE.md
  if (health.totalLines < DEFAULT_THRESHOLDS.claudemdThinLines && health.totalLines > 0) {
    const range = doc.lineAt(0).range;
    const diag = new vscode.Diagnostic(
      range,
      `CLAUDE.md is only ${health.totalLines} lines. Add build/test commands, architecture section, and coding conventions.`,
      vscode.DiagnosticSeverity.Information,
    );
    diag.code = 'thin-claudemd';
    diag.source = 'cc-insights';
    diagnostics.push(diag);
  }

  // Missing build commands
  if (health.totalLines > 0 && !/\b(build|test|lint|dev|start|run)\b/i.test(doc.getText())) {
    const range = doc.lineAt(0).range;
    const diag = new vscode.Diagnostic(
      range,
      'No build/test commands found. Add verification commands so Claude can self-check its work.',
      vscode.DiagnosticSeverity.Warning,
    );
    diag.code = 'missing-build-cmd';
    diag.source = 'cc-insights';
    diagnostics.push(diag);
  }

  diagnosticCollection.set(doc.uri, diagnostics);
}

export function reanalyseCurrentDocument(doc: vscode.TextDocument): void {
  analyseIfClaudeMd(doc);
}
