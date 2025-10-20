import * as vscode from 'vscode';
import { createStartUserProgramBuffer } from './command-utils';
import { Device } from '../ble';
import { Tree } from '../tree';

export async function startUserProgramAsync() {
  if (!Device.Current) {
    vscode.window.showErrorMessage('No device selected. Please connect to a Pybricks device first.');
    return;
  }

  // Clear logs before starting the program
  Tree.clearLogs();

  vscode.window.showInformationMessage('Starting user program...');

  const char = Device.ctrlEventChar!;
  await char.writeAsync(createStartUserProgramBuffer(), false);
  vscode.window.showInformationMessage('User program started.');
}