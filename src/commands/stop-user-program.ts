import * as vscode from 'vscode';
import { createStopUserProgramBuffer } from './command-utils';
import { Device } from '../ble';

export async function stopUserProgramAsync() {
  vscode.window.showInformationMessage('Stopping user program...');

  if (!Device.Current) {
    vscode.window.showErrorMessage('No device selected. Please connect to a Pybricks device first.');
    return;
  }

  const char = Device.ctrlEventChar!;
  await char.writeAsync(createStopUserProgramBuffer(), false);
  vscode.window.showInformationMessage('User program stopped.');
}