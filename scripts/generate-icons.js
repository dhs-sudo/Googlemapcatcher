import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const toCrc = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(toCrc), 8 + len);
  return buf;
}

function generatePng(width, height) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel scanlines
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.46;
  const rInner = width * 0.32;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep dark emerald / slate background: #064e3b (R: 6, G: 78, B: 59)
      let r = 6;
      let g = 78;
      let b = 59;
      let a = 255;

      // Darker outer gradient
      const grad = dist / (width * 0.5);
      r = Math.max(2, Math.round(15 - grad * 12));
      g = Math.max(30, Math.round(90 - grad * 50));
      b = Math.max(20, Math.round(70 - grad * 40));

      // Circular ring accent: #10b981
      if (Math.abs(dist - rOuter * 0.75) < width * 0.02) {
        r = 16;
        g = 185;
        b = 129;
      }

      // Compass pointer shape in center (45 degree rotated triangle)
      const nx = (dx + dy) * 0.7071;
      const ny = (-dx + dy) * 0.7071;

      // Check triangle coords
      if (ny > -width * 0.22 && ny < width * 0.22) {
        const halfW = (width * 0.22 - ny) * 0.45;
        if (Math.abs(nx) < halfW) {
          // Bright emerald fill: #34d399
          r = 52;
          g = 211;
          b = 153;

          // Inner ridge highlight
          if (Math.abs(nx) < width * 0.015) {
            r = 255;
            g = 255;
            b = 255;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePng(192, 192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePng(512, 512));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), generatePng(512, 512));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePng(180, 180));
fs.writeFileSync(path.join(outDir, 'favicon.ico'), generatePng(32, 32));

console.log('Successfully generated all PWA icons in public/');
