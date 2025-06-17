import * as vscode from 'vscode';
import { PYBRICKS_CONTROL_EVENT_CHARACTERISTIC_UUID, PYBRICKS_HUB_CAP_CHARACTERISTIC_UUID, PYBRICKS_SERVICE_UUID } from '../constants';
import { createStartUserProgramBuffer, createStopUserProgramBuffer, createUserProgramMetaBuffer, createWriteUserRamBuffer } from './command-utils';
import { Device } from '../ble';
import { compileAsync } from '../compile';

export async function compileAndRunAsync() {
  if (!Device.Current) {
    vscode.window.showErrorMessage('No device selected. Please connect to a Pybricks device first.');
    return;
  }
  vscode.window.showInformationMessage('Compiling user program...');
  const { characteristics } = await Device.Current.discoverSomeServicesAndCharacteristicsAsync(
    [PYBRICKS_SERVICE_UUID],
    [PYBRICKS_CONTROL_EVENT_CHARACTERISTIC_UUID, PYBRICKS_HUB_CAP_CHARACTERISTIC_UUID]
  );

  const blob = await compileAsync();
  const buffer = await characteristics[1].readAsync();
  const maxWriteSize = buffer.readUInt16LE(0);
  const maxUserProgramSize = buffer.readUInt32LE(6);
  if (blob.size > maxUserProgramSize) {
    vscode.window.showErrorMessage(`User program size (${blob.size}) exceeds maximum allowed size (${maxUserProgramSize}).`);
    return;
  }

  const char = characteristics[0];
  await char.writeAsync(createStopUserProgramBuffer(), false);
  await char.writeAsync(createUserProgramMetaBuffer(0), false);
  await char.writeAsync(createUserProgramMetaBuffer(blob.size), false);

  for (let offset = 0; offset < blob.size; offset += maxWriteSize) {
    const chunk = blob.slice(offset, offset + maxWriteSize);
    const buffer = createWriteUserRamBuffer(offset, new Uint8Array(await chunk.arrayBuffer()));
    await char.writeAsync(buffer, false);
  }

  await char.writeAsync(createStartUserProgramBuffer(), false);
  vscode.window.showInformationMessage('User program compiled and started successfully.');
};

