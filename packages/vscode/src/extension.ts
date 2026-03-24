import * as vscode from 'vscode';
import { activate as activateDiagnostics, reanalyseCurrentDocument, insightStore } from './diagnostics/provider';
import { QuickFixProvider } from './codeactions/quickfix';

// @ts-ignore - workspace link
import { analyseClaudeMdHealth, createDefaultContext, DEFAULT_THRESHOLDS, applyFixes } from '@ccinsights/core';

export function activate(context: vscode.ExtensionContext): void {
  activateDiagnostics(context);

  // Register code action provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { pattern: '**/CLAUDE.md' },
      new QuickFixProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),
  );

  // Register manual analyse command
  context.subscriptions.push(
    vscode.commands.registerCommand('cc-insights.analyse', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.fileName.toLowerCase().endsWith('claude.md')) {
        reanalyseCurrentDocument(editor.document);
      } else {
        vscode.window.showInformationMessage('Open a CLAUDE.md file to analyse it.');
      }
    }),
  );

  // Register fix-all command
  context.subscriptions.push(
    vscode.commands.registerCommand('cc-insights.fixAll', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.toLowerCase().endsWith('claude.md')) {
        vscode.window.showInformationMessage('Open a CLAUDE.md file to fix issues.');
        return;
      }

      const doc = editor.document;
      const uri = doc.uri.toString();

      // Collect all insights for this document that have fixes
      const insights = Array.from(insightStore.entries())
        .filter(([key, insight]) => key.startsWith(uri + ':') && insight.fix)
        .map(([, insight]) => insight);

      if (insights.length === 0) {
        vscode.window.showInformationMessage('No auto-fixable issues found.');
        return;
      }

      const fixed = applyFixes(doc.getText(), insights);
      const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
      );

      const edit = new vscode.WorkspaceEdit();
      edit.replace(doc.uri, fullRange, fixed);
      await vscode.workspace.applyEdit(edit);

      vscode.window.showInformationMessage(`Fixed ${insights.length} issue(s).`);
    }),
  );

  // Fix on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (!doc.fileName.toLowerCase().endsWith('claude.md')) return;

      const config = vscode.workspace.getConfiguration('ccInsights');
      if (!config.get<boolean>('fixOnSave', false)) return;

      const uri = doc.uri.toString();
      const insights = Array.from(insightStore.entries())
        .filter(([key, insight]) => key.startsWith(uri + ':') && insight.fix)
        .map(([, insight]) => insight);

      if (insights.length === 0) return;

      const fixed = applyFixes(doc.getText(), insights);
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.uri.toString() !== uri) return;

      const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
      );

      const edit = new vscode.WorkspaceEdit();
      edit.replace(doc.uri, fullRange, fixed);
      await vscode.workspace.applyEdit(edit);
      await doc.save();
    }),
  );

  // Register section breakdown command (used by bloat quick-fix)
  const outputChannel = vscode.window.createOutputChannel('CC Insights');
  context.subscriptions.push(
    vscode.commands.registerCommand('cc-insights.showBreakdown', async (uri: vscode.Uri) => {
      const doc = await vscode.workspace.openTextDocument(uri);
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      const projectCwd = workspaceFolder?.uri.fsPath || '';
      const ctx = createDefaultContext(projectCwd, DEFAULT_THRESHOLDS);
      const health = await analyseClaudeMdHealth(
        workspaceFolder?.name || 'unknown',
        uri.fsPath,
        doc.getText(),
        ctx,
      );

      outputChannel.clear();
      outputChannel.appendLine('CC Insights — Section Token Breakdown');
      outputChannel.appendLine('='.repeat(50));
      outputChannel.appendLine(`Total: ${health.totalLines} lines, ~${health.estimatedTokens} tokens\n`);
      for (const section of [...health.sections].sort((a, b) => b.estimatedTokens - a.estimatedTokens)) {
        const pct = health.estimatedTokens > 0 ? Math.round((section.estimatedTokens / health.estimatedTokens) * 100) : 0;
        outputChannel.appendLine(`  ${section.heading} (L${section.startLine}-${section.endLine}): ~${section.estimatedTokens} tokens (${pct}%)`);
      }
      outputChannel.show();
    }),
  );
}

export function deactivate(): void {}
