import * as vscode from 'vscode';
import { insightStore } from '../diagnostics/provider';

export class QuickFixProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'cc-insights') continue;

      const line = diagnostic.range.start.line + 1; // 1-indexed
      const key = `${document.uri.toString()}:${line}:${diagnostic.code}`;
      const insight = insightStore.get(key);

      if (insight?.fix) {
        const action = new vscode.CodeAction(
          insight.fix.description,
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        const edit = new vscode.WorkspaceEdit();
        const startLine = Math.max(0, insight.fix.startLine - 1);
        const endLine = Math.max(0, insight.fix.endLine - 1);

        if (insight.fix.newText === '') {
          // Delete lines
          const range = startLine < document.lineCount - 1
            ? new vscode.Range(
              document.lineAt(startLine).range.start,
              document.lineAt(startLine + 1).range.start,
            )
            : document.lineAt(startLine).rangeIncludingLineBreak;
          edit.delete(document.uri, range);
        } else {
          // Replace or insert lines
          if (startLine >= document.lineCount) {
            // Append at end of file
            const lastLine = document.lineAt(document.lineCount - 1);
            edit.insert(document.uri, lastLine.range.end, '\n' + insight.fix.newText);
          } else {
            const range = document.lineAt(startLine).range;
            edit.replace(document.uri, range, insight.fix.newText);
          }
        }

        action.edit = edit;
        actions.push(action);
      }

      // Keep the section breakdown command for bloat diagnostics
      if (diagnostic.code === 'claudemd-bloat') {
        const action = new vscode.CodeAction(
          'Show section token breakdown',
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diagnostic];
        action.command = {
          command: 'cc-insights.showBreakdown',
          title: 'Show breakdown',
          arguments: [document.uri],
        };
        actions.push(action);
      }
    }

    return actions;
  }
}
