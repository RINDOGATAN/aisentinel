/**
 * Generate static favicon files: public/favicon.ico and public/favicon.png
 *
 * Creates a shield icon in amber/gold (#f5a623) on dark background (#1a1a1a).
 * Uses only Node.js built-in modules (no image library dependencies).
 *
 * Run: npx tsx scripts/generate-favicon.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { deflateSync } from "zlib";

const SIZE = 32;
const BG = { r: 0x1a, g: 0x1a, b: 0x1a, a: 255 };
const FG = { r: 0xf5, g: 0xa6, b: 0x23, a: 255 };

/**
 * Shield shape test — determines if pixel (px, py) on a 32x32 grid
 * falls inside the shield silhouette.
 *
 * The shield is defined on a 24x28 coordinate space (matching the SVG viewBox),
 * then mapped to 32x32 with padding.
 */
function isInsideShield(px: number, py: number): boolean {
  // Map 32x32 pixel coords to 24x28 shield coords with centering
  const padX = 4;
  const padY = 2;
  const scaleX = 24 / (SIZE - padX * 2);
  const scaleY = 28 / (SIZE - padY * 2);
  const sx = (px - padX) * scaleX;
  const sy = (py - padY) * scaleY;

  if (sx < 0 || sx > 24 || sy < 0 || sy > 28) return false;

  // Shield top: two lines from (12,0) to (0,5) and (12,0) to (24,5)
  if (sy < 5) {
    const leftEdge = 12 - (12 / 5) * sy;
    const rightEdge = 12 + (12 / 5) * sy;
    return sx >= leftEdge && sx <= rightEdge;
  }

  // Shield body: vertical sides from y=5 to y=14, then curves in to point at (12,28)
  if (sy <= 14) {
    return sx >= 0 && sx <= 24;
  }

  // Shield bottom: narrows from full width at y=14 to point at (12,28)
  // Using a simple curve approximation
  const t = (sy - 14) / 14; // 0 at y=14, 1 at y=28
  const narrowFactor = 1 - t * t; // quadratic ease
  const halfWidth = 12 * narrowFactor;
  return sx >= 12 - halfWidth && sx <= 12 + halfWidth;
}

/** Create raw RGBA pixel buffer for the shield icon */
function createPixelData(): Buffer {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const offset = (y * SIZE + x) * 4;
      const c = isInsideShield(x, y) ? FG : BG;
      data[offset] = c.r;
      data[offset + 1] = c.g;
      data[offset + 2] = c.b;
      data[offset + 3] = c.a;
    }
  }
  return data;
}

/** Encode RGBA pixel data as a PNG file buffer */
function encodePNG(pixels: Buffer, width: number, height: number): Buffer {
  // PNG filter: prepend filter byte (0 = None) to each row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // filter type: None
    pixels.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(rawData);

  const chunks: Buffer[] = [];

  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(pngChunk("IHDR", ihdr));

  // IDAT
  chunks.push(pngChunk("IDAT", compressed));

  // IEND
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

/** Create a PNG chunk with CRC */
function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData) >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** CRC-32 implementation for PNG chunks */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return crc ^ 0xffffffff;
}

/** Wrap a PNG buffer in an ICO container */
function encodeICO(png: Buffer, width: number, height: number): Buffer {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(1, 4); // image count

  // ICO directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry[0] = width >= 256 ? 0 : width;
  entry[1] = height >= 256 ? 0 : height;
  entry[2] = 0; // palette size
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image data size
  entry.writeUInt32LE(22, 12); // offset to image data (6 + 16)

  return Buffer.concat([header, entry, png]);
}

// --- Main ---

const publicDir = join(process.cwd(), "public");
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const pixels = createPixelData();
const png = encodePNG(pixels, SIZE, SIZE);
const ico = encodeICO(png, SIZE, SIZE);

writeFileSync(join(publicDir, "favicon.png"), png);
writeFileSync(join(publicDir, "favicon.ico"), ico);

console.log("Generated:");
console.log(`  public/favicon.png (${png.length} bytes)`);
console.log(`  public/favicon.ico (${ico.length} bytes)`);
