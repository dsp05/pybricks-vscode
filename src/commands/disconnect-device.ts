import * as vscode from 'vscode';
import { Device } from '../ble';
import { Tree } from '../tree';

export async function disconnectDeviceAsync() {
  if (!Device.Current) {
    vscode.window.showErrorMessage('No device is currently connected.');
    return;
  }

  vscode.window.showInformationMessage(`Disconnecting from ${Device.Name}...`);
  await Device.disconnectAsync();
  Tree.refresh();
  vscode.window.showInformationMessage(`Disconnected from ${Device.Name}.`);
}