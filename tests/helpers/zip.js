import { inflateRawSync } from "node:zlib";

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

    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const content = compression === 0
      ? compressed
      : compression === 8
        ? inflateRawSync(compressed)
        : undefined;
    if (content === undefined) {
      throw new Error(`Unsupported compressed ZIP entry in test helper: ${name}`);
    }
    if (content.length !== uncompressedSize) {
      throw new Error(`Unexpected ZIP uncompressed size mismatch in test helper: ${name}`);
    }

    entries.set(name, content);
    offset = dataStart + compressedSize;
  }
  return entries;
}

export function zipCompressionMethods(bytes) {
  const localMethods = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && readUint32(bytes, offset) === 0x04034b50) {
    const method = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const nameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);
    const nameStart = offset + 30;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    localMethods.set(name, method);
    offset += 30 + nameLength + extraLength + compressedSize;
  }

  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) {
    throw new Error("ZIP end of central directory was not found in test helper.");
  }
  const entryCount = readUint16(bytes, eocdOffset + 10);
  offset = readUint32(bytes, eocdOffset + 16);
  const centralMethods = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(bytes, offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory entry in test helper.");
    }
    const method = readUint16(bytes, offset + 10);
    const nameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    const nameStart = offset + 46;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    if (localMethods.get(name) !== method) {
      throw new Error(`ZIP compression method mismatch between headers in test helper: ${name}`);
    }
    centralMethods.push(method);
    offset = nameStart + nameLength + extraLength + commentLength;
  }
  if (centralMethods.length !== localMethods.size) {
    throw new Error("ZIP local and central directory entry counts differ in test helper.");
  }
  return centralMethods;
}

function findEndOfCentralDirectory(bytes) {
  const minOffset = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}

export function unzipTextEntries(bytes) {
  const binaryEntries = unzipStoredEntries(bytes);
  const textEntries = new Map();
  for (const [name, data] of binaryEntries) {
    textEntries.set(name, decoder.decode(data));
  }
  return textEntries;
}

export function normalizeXml(xml) {
  return xml
    .replace(/></g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function expectXmlLines(xml, lines) {
  const normalized = normalizeXml(xml);
  const compact = normalized.replace(/\n/g, "");
  for (const line of lines) {
    if (!compact.includes(line.replace(/\n/g, ""))) {
      throw new Error(`Expected XML fragment was not found:\n${line}\n\nActual XML:\n${normalized}`);
    }
  }
}
