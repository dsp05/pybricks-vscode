import noble, { Characteristic, Peripheral } from "@abandonware/noble";
import * as vscode from 'vscode';
import { PYBRICKS_CONTROL_EVENT_CHARACTERISTIC_UUID, PYBRICKS_HUB_CAP_CHARACTERISTIC_UUID, PYBRICKS_SERVICE_UUID } from "./constants";
import { retryWithTimeout } from "./async";
import { Tree } from "./tree";

const outputChannel = vscode.window.createOutputChannel("Pybricks");

class BLE {
  private messageBuffer = ''; // Buffer to accumulate partial messages

  constructor(
    private device: Peripheral | null = null,
    private status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error' = 'disconnected',
    private allDevices: { [localName: string]: Peripheral } = {},
    public ctrlEventChar: Characteristic | null = null,
    public maxWriteSize: number | null = null,
    public maxUserProgramSize: number | null = null,
  ) { }

  public async disconnectAsync() {
    if (this.device && this.device.state === 'connected') {
      try {
        this.Status = 'disconnecting';
        await this.ctrlEventChar?.unsubscribeAsync();
        await this.device.disconnectAsync();
        this.Status = 'disconnected';
        // Clear message buffer on disconnect
        this.messageBuffer = '';
      } catch (error) {
        this.Status = 'error';
      }
    }
  }

  public async connectAsync(name: string, onChange?: () => void) {
    if (this.Status !== 'disconnected' && this.Status !== 'error') {
      return;
    }

    vscode.window.showInformationMessage(`Connecting to ${name}...`);
    const peripheral = this.allDevices[name];
    if (!peripheral) {
      vscode.window.showErrorMessage(`Device ${name} not found.`);
      return;
    }

    try {
      this.Status = 'connecting';
      // Clear logs and message buffer when connecting to a new device
      Tree.clearLogs();
      this.messageBuffer = '';

      await retryWithTimeout(async () => {
        console.log(`Trying to connect to ${name}...`);
        try {
          await peripheral.connectAsync();
        } catch { }
        await peripheral.discoverServicesAsync([PYBRICKS_SERVICE_UUID]);
      });
      peripheral.on('disconnect', () => {
        if (this.Status === 'connected') {
          vscode.window.showInformationMessage(`Disconnected from ${peripheral?.advertisement.localName}`);
          this.Status = 'disconnected';
        }
        onChange && onChange();
      });
      this.device = peripheral;

      const { characteristics } = await this.device.discoverSomeServicesAndCharacteristicsAsync(
        [PYBRICKS_SERVICE_UUID],
        [PYBRICKS_CONTROL_EVENT_CHARACTERISTIC_UUID, PYBRICKS_HUB_CAP_CHARACTERISTIC_UUID]
      );
      this.ctrlEventChar = characteristics[0];
      const buffer = await characteristics[1].readAsync();
      this.maxWriteSize = buffer.readUInt16LE(0);
      this.maxUserProgramSize = buffer.readUInt32LE(6);
      await this.ctrlEventChar.subscribeAsync();
      this.ctrlEventChar.on('data', (data, isNotification) => {
        if (!isNotification) {
          return;
        }
        const flag = data.readUInt8(0);
        if (flag !== 0x01) { // Ignore echo
          return;
        }
        const message = data.toString('utf8', 1);
        // Add to output channel immediately (preserve original behavior)
        outputChannel.append(message);

        // Buffer the message and process complete lines
        this.messageBuffer += message;
        const lines = this.messageBuffer.split('\n');

        // Keep the last part (might be incomplete line) in buffer
        this.messageBuffer = lines.pop() || '';

        // Add complete lines to tree
        for (const line of lines) {
          if (line.length > 0) { // Only add non-empty lines
            Tree.addLog(line);
          }
        }
      });

      this.Status = 'connected';
      onChange && onChange();
      vscode.window.showInformationMessage(`Connected to ${peripheral.advertisement.localName}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect to ${name}: ${error}`);
      this.Status = 'error';
    }
  }

  public async startScanningAsync(onDiscover?: (peripheral: Peripheral) => void) {
    await retryWithTimeout(async () => {
      console.log('Starting BLE scan...');
      await this.startScanningOnceAsync(onDiscover);
    }, async () => {
      try {
        await this.stopScanningAsync();
      } catch (error) {
        console.error(error);
      }
    });
  }

  private async startScanningOnceAsync(onDiscover?: (peripheral: Peripheral) => void) {
    if (this.Status === 'connecting' || this.Status === 'disconnecting') {
      return;
    }
    this.allDevices = {};
    noble.on('discover', (peripheral) => {
      const { localName, serviceUuids } = peripheral.advertisement;
      if (!localName || localName in this.allDevices) {
        return;
      }

      if (!serviceUuids || !serviceUuids.includes(PYBRICKS_SERVICE_UUID)) {
        return;
      }

      this.allDevices[localName] = peripheral;

      if (onDiscover) {
        onDiscover(peripheral);
      }
    });
    await noble.startScanningAsync([], true);

    while (Object.keys(this.allDevices).length === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  public async stopScanningAsync() {
    noble.removeAllListeners('discover');
    await noble.stopScanningAsync();
  }


  public get Status() {
    return this.status;
  }

  private set Status(newStatus: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error') {
    this.status = newStatus;
    if (newStatus === 'error') {
      vscode.window.showErrorMessage('An error occurred with the Bluetooth connection.');
    }
  }

  public get Current() {
    return this.Status === 'connected' ? this.device : null;
  }

  public get Name() {
    return this.Current?.advertisement.localName ?? "No Device Connected";
  }
}

export const Device = new BLE();