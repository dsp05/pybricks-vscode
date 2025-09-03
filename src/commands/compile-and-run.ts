import * as vscode from 'vscode';
import {
  createStartUserProgramBuffer, createStopUserProgramBuffer,
  createUserProgramMetaBuffer, createWriteUserRamBuffer
} from './command-utils';
import { Device } from '../ble';
import { compileAsync } from '../compile';

export async function compileAndRunAsync() {
  if (!Device.Current) {
    vscode.window.showErrorMessage('No device selected. Please connect to a Pybricks device first.');
    return;
  }
  vscode.window.showInformationMessage('Compiling user program...');

  const blob = await compileAsync();
  const maxUserProgramSize = Device.maxUserProgramSize!;
  if (blob.size > maxUserProgramSize) {
    vscode.window.showErrorMessage(`User program size (${blob.size}) exceeds maximum allowed size (${maxUserProgramSize}).`);
    return;
  }

  const char = Device.ctrlEventChar!;
  await char.writeAsync(createStopUserProgramBuffer(), false);
  await char.writeAsync(createUserProgramMetaBuffer(0), false);

  const writeSize = Device.maxWriteSize! - 5; // 5 bytes for the header
  for (let offset = 0; offset < blob.size; offset += writeSize) {
    const chunk = blob.slice(offset, offset + writeSize);
    const buffer = createWriteUserRamBuffer(offset, new Uint8Array(await chunk.arrayBuffer()));
    await char.writeAsync(buffer, false);
  }
  await char.writeAsync(createUserProgramMetaBuffer(blob.size), false);
  await char.writeAsync(createStartUserProgramBuffer(), false);

  vscode.window.showInformationMessage('User program compiled and started successfully.');
};

