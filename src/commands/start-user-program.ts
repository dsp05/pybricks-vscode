import * as vscode from 'vscode';
import { createStartUserProgramBuffer } from './command-utils';
import { Device } from '../ble';

export async function startUserProgramAsync() {
  vscode.window.showInformationMessage('Starting user program...');

  if (!Device.Current) {
    vscode.window.showErrorMessage('No device selected. Please connect to a Pybricks device first.');
    return;
  }

  const char = Device.ctrlEventChar!;
  await char.writeAsync(createStartUserProgramBuffer(), false);
  vscode.window.showInformationMessage('User program started.');
}