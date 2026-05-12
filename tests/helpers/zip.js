const decoder = new TextDecoder();

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

export function unzipStoredEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && readUint32(bytes, offset) === 0x04034b50) {
    const compression = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const uncompressedSize = readUint32(bytes, offset + 22);
    const nameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));

    if (compression !== 0) {
      throw new Error(`Unsupported compressed ZIP entry in test helper: ${name}`);
    }
    if (compressedSize !== uncompressedSize) {
      throw new Error(`Unexpected ZIP size mismatch in test helper: ${name}`);
    }

    entries.set(name, bytes.slice(dataStart, dataStart + uncompressedSize));
    offset = dataStart + compressedSize;
  }
  return entries;
}

export function unzipTextEntries(bytes) {
  const binaryEntries = unzipStoredEntries(bytes);
  const textEntries = new Map();
  for (const [name, data] of binaryEntries) {
    textEntries.set(name, decoder.decode(data));
  }
  return textEntries;
}
