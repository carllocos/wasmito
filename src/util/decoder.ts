export interface LEB128Decoding {
  value: number;
  bytesRead: number;
}

export function decodeLEB128(
  uint8Array: Uint8Array,
): LEB128Decoding | undefined {
  let value = 0;
  let bytesRead = 0;
  let shift = 0;

  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i];
    value |= (byte & 0x7f) << shift;
    bytesRead++;

    if ((byte & 0x80) === 0) {
      // Encountered the last byte
      if (shift > 28 && (byte & 0x70) !== 0) {
        // Overflow check for 32-bit signed integers
        throw new Error('LEB128 encoding overflow');
      }
      return { value, bytesRead };
    }

    shift += 7;
  }

  return undefined;
}

export function hexStringToUint8Array(
  hexString: string,
): Uint8Array | undefined {
  const isValidHexString = /^[0-9A-Fa-f]+$/g.test(hexString);
  if (!isValidHexString) {
    return undefined;
  }

  const parsedArray = hexString
    .match(/.{1,2}/g)
    ?.map((byte) => parseInt(byte, 16));

  if (parsedArray === undefined) {
    return undefined;
  }

  return new Uint8Array(parsedArray);
}

export function isHexaString(v: string): boolean {
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(v);
}
