import * as vscode from 'vscode';
import { Device } from '../ble';
import { Tree } from '../tree';

const items: vscode.QuickPickItem[] = [];

export async function connectDeviceAsync() {
  items.length = 0;
  const quickPick = vscode.window.createQuickPick();
  quickPick.title = "Scanning...";
  quickPick.ignoreFocusOut = true;
  quickPick.onDidHide(Device.stopScanningAsync.bind(Device));
  quickPick.onDidAccept(async () => {
    const name = quickPick.selectedItems[0].label;
    quickPick.enabled = false;
    quickPick.title = `Connecting to ${name}...`;
    quickPick.busy = true;
    await Device.connectAsync(name, Tree.refresh.bind(Tree));
    quickPick.busy = false;
    quickPick.hide();
  });
  quickPick.show();
  await Device.startScanningAsync((peripheral) => {
    const label = peripheral.advertisement.localName || peripheral.id;
    if (items.some(item => item.label === label)) {
      return;
    }

    items.push({
      label: label,
    });
    quickPick.items = items;
  });
}