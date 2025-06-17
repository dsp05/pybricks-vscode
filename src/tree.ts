import * as vscode from 'vscode';
import { Device } from './ble';

class TreeItem extends vscode.TreeItem {
  constructor(
    title: string,
    label: string,
    command: string,
    icon: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
  ) {
    super(label, collapsibleState);
    if (command) {
      this.command = {
        command: command,
        title: title,
      };
    }
    if (icon) {
      this.iconPath = new vscode.ThemeIcon(icon);
    }
  }
}

const connectDevice = new TreeItem("Connect Device", "Connect Device", 'pybricks.connectDevice', 'link');
const disconnectDevice = new TreeItem("Disconnect Device", "Disconnect Device", 'pybricks.disconnectDevice', 'debug-disconnect');
const actions = new TreeItem("Actions", "Actions", '', '', vscode.TreeItemCollapsibleState.Expanded);
const compileAndRun = new TreeItem("Compile and Run", "Compile and Run", 'pybricks.compileAndRun', 'run-all');
const startUserProgram = new TreeItem("Start User Program", "Start User Program", 'pybricks.startUserProgram', 'debug-start');
const stopUserProgram = new TreeItem("Stop", "Stop User Program", 'pybricks.stopUserProgram', 'debug-stop');

class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItem): TreeItem {
    if (element === disconnectDevice) {
      element.label = Device.Current ? `Disconnect from ${Device.Current.advertisement.localName}` : 'Disconnect';
    }
    return element;
  }

  getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
    if (!element) {
      return Device.Current ? [
        connectDevice,
        disconnectDevice,
        actions,
      ] : [connectDevice];
    } else if (element === actions) {
      return [compileAndRun, startUserProgram, stopUserProgram];
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

export const Tree = new TreeDataProvider();
