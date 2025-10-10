import * as vscode from 'vscode';

let _context: vscode.ExtensionContext;
const ENTRYPOINT_KEY = 'pybricks.entryPointFile';

export function initializeState(context: vscode.ExtensionContext): void {
  _context = context;
}

export function getEntryPointFile(): vscode.Uri | undefined {
  const entryPointPath = _context.workspaceState.get<string>(ENTRYPOINT_KEY);
  return entryPointPath ? vscode.Uri.file(entryPointPath) : undefined;
}

export function setEntryPointFile(file: vscode.Uri | undefined): void {
  if (file) {
    _context.workspaceState.update(ENTRYPOINT_KEY, file.fsPath);
  } else {
    _context.workspaceState.update(ENTRYPOINT_KEY, undefined);
  }
}

export function clearEntryPointFile(): void {
  _context.workspaceState.update(ENTRYPOINT_KEY, undefined);
}