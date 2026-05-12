import type { ImageAsset } from "./types.ts";

export const DOC_BODY_WIDTH_EMU = 5943600;
const EMU_PER_PIXEL_AT_96_DPI = 9525;

export function safeMediaName(index: number, path: string): string {
  const file = path.split(/[\\/]/).pop() || `image-${index}.bin`;
  const ext = file.includes(".") ? file.split(".").pop() : "bin";
  return `image-${index}.${String(ext).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"}`;
}

export function displaySizeForImage(asset: ImageAsset): { width: number; height: number; resized: boolean } {
  const size = imageSize(asset.data);
  const naturalWidth = (size?.width ?? 320) * EMU_PER_PIXEL_AT_96_DPI;
  const naturalHeight = (size?.height ?? 240) * EMU_PER_PIXEL_AT_96_DPI;
  const displayWidth = Math.min(naturalWidth, DOC_BODY_WIDTH_EMU);
  const displayHeight = Math.round(displayWidth * naturalHeight / naturalWidth);
  return {
    width: displayWidth,
    height: displayHeight,
    resized: displayWidth < naturalWidth
  };
}

export function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function imageSize(data: Uint8Array): { width: number; height: number } | undefined {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return { width: readBe32(data, 16), height: readBe32(data, 20) };
  }
  if (data.length >= 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return { width: readLe16(data, 6), height: readLe16(data, 8) };
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) return undefined;
      const marker = data[offset + 1];
      const length = readBe16(data, offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: readBe16(data, offset + 5), width: readBe16(data, offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return undefined;
}

function readBe16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function readLe16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readBe32(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
}
