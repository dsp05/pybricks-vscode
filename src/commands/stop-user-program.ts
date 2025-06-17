import * as vscode from 'vscode';
import { PYBRICKS_CONTROL_EVENT_CHARACTERISTIC_UUID, PYBRICKS_SERVICE_UUID } from '../constants';
import { createStopUserProgramBuffer } from './command-utils';
import { Device } from '../ble';

export async function stopUserProgramAsync() {
  vscode.window.showInformationMessage('Stopping user program...');

  if (!Device.Current) {
    vscode.window.showErrorMessage('No device selected. Please connect to a Pybricks device first.');
    return;
  }

  const { characteristics } = await Device.Current.discoverSomeServicesAndCharacteristicsAsync(
    [PYBRICKS_SERVICE_UUID],
    [PYBRICKS_CONTROL_EVENT_CHARACTERISTIC_UUID]
  );
  const char = characteristics[0];
  await char.writeAsync(createStopUserProgramBuffer(), false);
  vscode.window.showInformationMessage('User program stopped.');
}