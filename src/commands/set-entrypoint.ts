import * as vscode from 'vscode';
import { setEntryPointFile, getEntryPointFile, clearEntryPointFile } from '../state';
import { Tree } from '../tree';
import path from 'path';

export async function setEntryPointAsync(): Promise<void> {
  const currentEntryPoint = getEntryPointFile();

  // Show options to set new entrypoint or clear current one
  const options: vscode.QuickPickItem[] = [
    {
      label: '$(file-add) Select new entrypoint file',
      description: 'Choose a Python file to use as the entrypoint'
    }
  ];

  if (currentEntryPoint) {
    // Check if the current entrypoint file still exists
    let fileExists = true;
    try {
      await vscode.workspace.fs.stat(currentEntryPoint);
    } catch {
      fileExists = false;
    }

    const fileName = path.basename(currentEntryPoint.fsPath);
    const statusIcon = fileExists ? '$(check)' : '$(warning)';
    const statusText = fileExists ? 'Current entrypoint' : 'File not found';

    options.unshift({
      label: `${statusIcon} ${fileName}`,
      description: `${statusText}: ${currentEntryPoint.fsPath}`,
      detail: fileExists ? undefined : 'This file no longer exists'
    });

    options.push({
      label: '$(trash) Clear current entrypoint',
      description: 'Remove the entrypoint and use the active file instead'
    });
  } else {
    options.unshift({
      label: '$(info) No entrypoint set',
      description: 'Currently using the active file for compilation',
      detail: 'Select "Select new entrypoint file" to set one'
    });
  }

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: 'Manage entrypoint file for compilation',
    matchOnDescription: true
  });

  if (!selected) {
    return; // User cancelled
  }

  if (selected.label.includes('Clear current entrypoint')) {
    clearEntryPointFile();
    Tree.refresh(); // Refresh tree to hide entrypoint item
    vscode.window.showInformationMessage('Entrypoint cleared. Will use currently active file for compilation.');
    return;
  }

  if (selected.label.includes('No entrypoint set') || selected.label.includes('Current entrypoint')) {
    if (currentEntryPoint) {
      // User selected the current entrypoint, check if it exists
      try {
        await vscode.workspace.fs.stat(currentEntryPoint);
        vscode.window.showInformationMessage(`Current entrypoint: ${currentEntryPoint.fsPath}`);
        return;
      } catch {
        // File doesn't exist, continue to file picker
      }
    } else {
      // No entrypoint set, continue to file picker
    }
  }

  if (!selected.label.includes('Select new entrypoint file')) {
    return;
  }

  // Determine default URI for file picker
  let defaultUri: vscode.Uri | undefined;

  if (currentEntryPoint) {
    // Use directory of current entrypoint
    defaultUri = vscode.Uri.file(path.dirname(currentEntryPoint.fsPath));
  } else {
    // Use current workspace folder or active file's directory
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      defaultUri = vscode.workspace.workspaceFolders[0].uri;
    } else if (vscode.window.activeTextEditor) {
      defaultUri = vscode.Uri.file(path.dirname(vscode.window.activeTextEditor.document.uri.fsPath));
    }
  }

  // Show file picker for Python files
  const fileUris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    openLabel: 'Set as entrypoint',
    filters: {
      'Python files': ['py']
    },
    defaultUri: defaultUri
  });

  if (!fileUris || fileUris.length === 0) {
    return; // User cancelled
  }

  const selectedFile = fileUris[0];
  setEntryPointFile(selectedFile);
  Tree.refresh(); // Refresh tree to show new entrypoint item
  const fileName = path.basename(selectedFile.fsPath);
  vscode.window.showInformationMessage(`Entrypoint set to: ${fileName}`);
}