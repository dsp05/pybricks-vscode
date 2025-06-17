
export function createUserProgramMetaBuffer(size: number): Buffer {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt8(3, 0);
  buffer.writeUInt32LE(size, 1);
  return buffer;
}

export function createWriteUserRamBuffer(offset: number, payload: Uint8Array): Buffer {
  const buffer = Buffer.alloc(5 + payload.byteLength);
  buffer.writeUInt8(4, 0);
  buffer.writeUInt32LE(offset, 1);
  buffer.set(payload, 5);
  return buffer;
}

export function createStopUserProgramBuffer() {
  return Buffer.from([0x00]);
}

export function createStartUserProgramBuffer() {
  return Buffer.from([0x01]);
}