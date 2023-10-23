export function encodeLEB128(value: number): number[] {
  const result: number[] = [];

  do {
    let byte = value & 0x7f;
    value >>>= 7;

    if (value !== 0) {
      byte |= 0x80;
    }

    result.push(byte);
  } while (value !== 0);

  return result;
}

export function encodeLEB128ToHex(value: number): string {
  const bytes = encodeLEB128(value);
  const hexString = bytes
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return hexString;
}

export function floatToSinglePrecisionBuffer(num: number): ArrayBuffer {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, num, true); // The 'true' argument indicates little-endian byte order.
  return buffer;
}

export function bufferToHexString(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function floatToHexString(float: number): string {
  const buf = floatToSinglePrecisionBuffer(float);
  return bufferToHexString(buf);
}

export function serializeUInt16BE(n: number): string {
  return serializeUInt(n, 2, true);
}

export function serializeUInt(
  n: number,
  amountBytes: number,
  bigendian: boolean,
): string {
  const buff = Buffer.allocUnsafe(amountBytes);
  if (amountBytes === 1) {
    if (n < 0) {
      buff.writeInt8(n);
    } else {
      buff.writeUInt8(n);
    }
  } else if (amountBytes === 2) {
    if (bigendian) {
      if (n < 0) {
        buff.writeUInt16BE(n);
      } else {
        buff.writeUInt16BE(n);
      }
    } else {
      if (n < 0) {
        buff.writeInt16LE(n);
      } else {
        buff.writeUInt16LE(n);
      }
    }
  } else if (amountBytes === 4) {
    if (bigendian) {
      if (n < 0) {
        buff.writeInt32BE(n);
      } else {
        buff.writeUInt32BE(n);
      }
    } else {
      if (n < 0) {
        buff.writeInt32LE(n);
      } else {
        buff.writeUInt32LE(n);
      }
    }
  } else {
    throw new Error('invalid amount of bytes');
  }
  return buff.toString('hex');
}
