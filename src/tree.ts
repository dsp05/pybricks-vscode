import * as vscode from 'vscode';
import { Device } from './ble';
import { getEntryPointFile } from './state';
import path from 'path';

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

// Log-specific tree item class
class LogItem extends TreeItem {
  constructor(
    public readonly message: string,
    public readonly timestamp: Date,
  ) {
    const timeStr = timestamp.toLocaleTimeString();
    super(`Log: ${message}`, `[${timeStr}] ${message.trimEnd()}`, '', '');
  }
}

const connectDevice = new TreeItem("Connect Device", "Connect Device", 'pybricks.connectDevice', 'link');
const disconnectDevice = new TreeItem("Disconnect Device", "Disconnect Device", 'pybricks.disconnectDevice', 'debug-disconnect');
const actions = new TreeItem("Actions", "Actions", '', '', vscode.TreeItemCollapsibleState.Expanded);
const logs = new TreeItem("Logs", "Logs", '', 'output', vscode.TreeItemCollapsibleState.Expanded);
const setEntryPoint = new TreeItem("Set Entrypoint", "Set Entrypoint", 'pybricks.setEntryPoint', 'gear');
const compileAndRun = new TreeItem("Compile and Start Program", "Compile and Start Program", 'pybricks.compileAndRun', 'run-all');
const startUserProgram = new TreeItem("Start Program", "Start Program", 'pybricks.startUserProgram', 'debug-start');
const stopUserProgram = new TreeItem("Stop Program", "Stop Program", 'pybricks.stopUserProgram', 'debug-stop');

class TreeDataProvider implements vscode.TreeDataProvider<TreeItem | LogItem> {
  private logItems: LogItem[] = [];
  private maxLogItems = 50; // Limit log items to prevent memory issues

  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | LogItem | undefined | void> = new vscode.EventEmitter<TreeItem | LogItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | LogItem | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItem | LogItem): TreeItem | LogItem {
    if (element === disconnectDevice) {
      element.label = Device.Current ? `Disconnect from ${Device.Current.advertisement.localName}` : 'Disconnect';
    } else if (element === setEntryPoint) {
      // Update the Set Entrypoint title to include current entrypoint name
      const entryPointFile = getEntryPointFile();
      if (entryPointFile) {
        const fileName = path.basename(entryPointFile.fsPath);
        element.label = `Set Entrypoint (${fileName})`;
      } else {
        element.label = 'Set Entrypoint';
      }
    } else if (element === logs) {
      // Update logs label to show count
      element.label = `Logs (${this.logItems.length})`;
    }
    return element;
  }

  getChildren(element?: TreeItem | LogItem): vscode.ProviderResult<(TreeItem | LogItem)[]> {
    if (!element) {
      const baseItems = [connectDevice];
      if (Device.Current) {
        baseItems.push(disconnectDevice, actions);
        // Only show logs section if there are logs
        if (this.logItems.length > 0) {
          baseItems.push(logs);
        }
      }
      return baseItems;
    } else if (element === actions) {
      return [compileAndRun, startUserProgram, stopUserProgram, setEntryPoint];
    } else if (element === logs) {
      // Return log items in chronological order (oldest first)
      return this.logItems;
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  // Method to add a new log message
  addLog(message: string) {
    const logItem = new LogItem(message, new Date());
    this.logItems.push(logItem);

    // Limit the number of log items
    if (this.logItems.length > this.maxLogItems) {
      this.logItems.shift(); // Remove oldest item
    }

    this.refresh();
  }

  // Method to clear all logs
  clearLogs() {
    this.logItems = [];
    this.refresh();
  }
}

export const Tree = new TreeDataProvider();
