import * as vscode from 'vscode';

// @ts-ignore - workspace link
import { analyse, type Insight } from '@ccinsights/core';

let diagnosticCollection: vscode.DiagnosticCollection;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

// Module-level insight storage for quickfix provider
export const insightStore = new Map<string, Insight>();

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

  const result = await analyse({
    projects: [{
      path: projectCwd,
      projectCwd,
      name: workspaceFolder?.name || 'unknown',
      claudeMdContent: doc.getText(),
      claudeMdPath: doc.uri.fsPath,
      sessions: [],
    }],
  });

  // Clear previous insights for this document
  for (const key of insightStore.keys()) {
    if (key.startsWith(doc.uri.toString() + ':')) {
      insightStore.delete(key);
    }
  }

  const diagnostics: vscode.Diagnostic[] = [];

  for (const insight of result.insights) {
    const line = insight.line ? Math.max(0, insight.line - 1) : 0;
    const range = doc.lineAt(Math.min(line, doc.lineCount - 1)).range;

    const severity = insight.severity === 'warning'
      ? vscode.DiagnosticSeverity.Warning
      : vscode.DiagnosticSeverity.Information;

    const fixable = insight.fix ? ' [fixable]' : '';
    const diag = new vscode.Diagnostic(range, `${insight.message}${fixable}`, severity);
    diag.code = insight.rule;
    diag.source = 'cc-insights';
    diagnostics.push(diag);

    // Store insight for quickfix
    const insightLine = insight.line || 1;
    insightStore.set(`${doc.uri.toString()}:${insightLine}:${insight.rule}`, insight);
  }

  diagnosticCollection.set(doc.uri, diagnostics);
}

export function reanalyseCurrentDocument(doc: vscode.TextDocument): void {
  analyseIfClaudeMd(doc);
}
