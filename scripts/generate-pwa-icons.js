import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create clean, high-contrast brand SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="50%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#022c22"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)"/>
  <rect x="16" y="16" width="480" height="480" rx="92" fill="none" stroke="url(#goldGrad)" stroke-width="6" opacity="0.4"/>

  <!-- Center Decorative Plate / Ring -->
  <circle cx="256" cy="236" r="148" fill="#047857" stroke="url(#goldGrad)" stroke-width="8" filter="url(#shadow)"/>
  
  <!-- Printing Press / Page Icon Graphic -->
  <path d="M196 170 h120 v36 h-120 z" fill="#f8fafc" opacity="0.9"/>
  <path d="M176 216 h160 v80 h-160 z" fill="#f1f5f9" rx="8"/>
  <path d="M206 296 h100 v50 h-100 z" fill="url(#goldGrad)"/>

  <!-- CMYK Color Registration Marks -->
  <circle cx="206" cy="256" r="14" fill="#06b6d4"/>
  <circle cx="239" cy="256" r="14" fill="#ec4899"/>
  <circle cx="273" cy="256" r="14" fill="#eab308"/>
  <circle cx="306" cy="256" r="14" fill="#0f172a"/>

  <!-- Press Paper Lines -->
  <line x1="220" y1="316" x2="292" y2="316" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
  <line x1="230" y1="328" x2="282" y2="328" stroke="#047857" stroke-width="4" stroke-linecap="round"/>

  <!-- Bengali Typography "মক্কা প্রিন্টার্স" -->
  <text x="256" y="432" font-family="'Hind Siliguri', 'Noto Sans Bengali', sans-serif" font-size="44" font-weight="800" text-anchor="middle" fill="#f8fafc" letter-spacing="1">মক্কা প্রিন্টার্স</text>
  <text x="256" y="468" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="url(#goldGrad)" letter-spacing="3">MAKKAH PRINTERS</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Pure Node PNG creator (Generates valid uncompressed/deflated RGB PNG buffers)
function createPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: 2 (Truecolor RGB)
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = width * 3 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Draw rounded aesthetic icon programmatically
      const isInsideCenter = dist < radius * 0.65;
      const isGoldRing = Math.abs(dist - radius * 0.68) < Math.max(2, width * 0.02);

      if (isGoldRing) {
        rawData[pixelOffset] = 234; // Gold R
        rawData[pixelOffset + 1] = 179; // Gold G
        rawData[pixelOffset + 2] = 8; // Gold B
      } else if (isInsideCenter) {
        rawData[pixelOffset] = 5; // Deep Emerald
        rawData[pixelOffset + 1] = 150;
        rawData[pixelOffset + 2] = 105;
      } else {
        // Outer gradient-like background
        const gradFactor = 1 - (y / height) * 0.4;
        rawData[pixelOffset] = Math.round(r * gradFactor);
        rawData[pixelOffset + 1] = Math.round(g * gradFactor);
        rawData[pixelOffset + 2] = Math.round(b * gradFactor);
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table & calculation
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

// Generate PNG assets
const pwa192 = createPng(192, 192, 4, 120, 87);
const pwa512 = createPng(512, 512, 4, 120, 87);
const appleIcon = createPng(180, 180, 4, 120, 87);
const maskable512 = createPng(512, 512, 4, 120, 87);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskable512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Successfully generated all PWA icons in /public!');
