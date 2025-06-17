import * as vscode from 'vscode';
import { connectDeviceAsync } from './commands/connect-device';
import { compileAndRunAsync } from './commands/compile-and-run';
import { stopUserProgramAsync } from './commands/stop-user-program';
import { startUserProgramAsync } from './commands/start-user-program';
import { Tree } from './tree';
import { disconnectDeviceAsync } from './commands/disconnect-device';

export function activate(context: vscode.ExtensionContext) {

  const commands: [string, () => Promise<void>][] = [
    ['connectDevice', connectDeviceAsync],
    ['compileAndRun', compileAndRunAsync],
    ['startUserProgram', startUserProgramAsync],
    ['stopUserProgram', stopUserProgramAsync],
    ['disconnectDevice', disconnectDeviceAsync],
  ];

  context.subscriptions.push(...commands.map(([name, command]) => vscode.commands.registerCommand(`pybricks.${name}`, command)));
  vscode.window.registerTreeDataProvider('pybricks', Tree);
}

export function deactivate() { }
