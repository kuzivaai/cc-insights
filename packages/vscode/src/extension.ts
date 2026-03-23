import * as vscode from 'vscode';
import { activate as activateDiagnostics, reanalyseCurrentDocument } from './diagnostics/provider';
import { QuickFixProvider } from './codeactions/quickfix';

// @ts-ignore - workspace link
import { analyseClaudeMdHealth, createDefaultContext, DEFAULT_THRESHOLDS } from '@cc-insights/core';

export function activate(context: vscode.ExtensionContext): void {
  activateDiagnostics(context);

  // Register code action provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionProvider(
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
