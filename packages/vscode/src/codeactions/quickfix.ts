import * as vscode from 'vscode';

export class QuickFixProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'cc-insights') continue;

      if (diagnostic.code === 'stale-file-ref' || diagnostic.code === 'stale-command-ref') {
        const action = new vscode.CodeAction(
          'Remove stale reference',
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        const edit = new vscode.WorkspaceEdit();
        const lineRange = document.lineAt(diagnostic.range.start.line).rangeIncludingLineBreak;
        edit.delete(document.uri, lineRange);
        action.edit = edit;
        actions.push(action);
      }

      if (diagnostic.code === 'missing-build-cmd') {
        const action = new vscode.CodeAction(
          'Add verification commands section',
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diagnostic];
        const edit = new vscode.WorkspaceEdit();
        const lastLine = document.lineAt(document.lineCount - 1);
        edit.insert(document.uri, lastLine.range.end, '\n\n## Commands\n\n```bash\n# npm run build\n# npm run test\n# npm run lint\n```\n');
        action.edit = edit;
        actions.push(action);
      }

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
