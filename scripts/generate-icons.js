import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icon.svg
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f111a" />
      <stop offset="50%" stop-color="#181028" />
      <stop offset="100%" stop-color="#090a0f" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="url(#primaryGrad)" stroke-width="6" opacity="0.4" />
  
  <!-- Film reel / Play shape -->
  <g transform="translate(256, 256)" filter="url(#glow)">
    <!-- Stylized Hex / Shield Film Reel -->
    <path d="M-80 -120 L80 -120 L130 -30 L100 90 L-100 90 L-130 -30 Z" fill="none" stroke="url(#primaryGrad)" stroke-width="18" stroke-linejoin="round" />
    <!-- Play Triangle -->
    <polygon points="-30,-60 65,0 -30,60" fill="url(#primaryGrad)" />
    <!-- Sparks / Cuts -->
    <circle cx="-65" cy="-80" r="10" fill="#a855f7" />
    <circle cx="65" cy="-80" r="10" fill="#06b6d4" />
    <circle cx="-85" cy="50" r="10" fill="#6366f1" />
    <circle cx="85" cy="50" r="10" fill="#a855f7" />
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
console.log('Saved icon.svg');

// Simple pure Node PNG generator with built-in zlib
function createPNG(size, isMaskable = false) {
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(height * (width * 4 + 1));
  
  const cx = width / 2;
  const cy = height / 2;
  const rMax = width / 2;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    buffer[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient: dark violet/black
      const t = (x + y) / (width + height);
      let r = Math.round(15 + t * 15);
      let g = Math.round(16 + t * 5);
      let b = Math.round(26 + t * 20);
      let a = 255;

      // Safe margin for maskable
      const safeR = isMaskable ? rMax * 0.72 : rMax * 0.85;

      // Center play triangle + hex
      if (dist < safeR) {
        // Hexagon frame border
        const angle = Math.atan2(dy, dx);
        const hexR = safeR * 0.75;
        const inHexBorder = Math.abs(dist - hexR) < (size * 0.035);

        // Play triangle
        // Coordinates relative to center: (-0.15 to +0.3) in X, (-0.25 to +0.25) in Y
        const tx = dx / safeR;
        const ty = dy / safeR;
        const inTriangle = tx >= -0.22 && tx <= 0.38 && Math.abs(ty) <= (0.38 - tx) * 0.75;

        if (inTriangle) {
          // Gradient violet to cyan
          const grad = (tx + 0.22) / 0.6;
          r = Math.round(168 * (1 - grad) + 6 * grad);
          g = Math.round(85 * (1 - grad) + 182 * grad);
          b = Math.round(247 * (1 - grad) + 212 * grad);
        } else if (inHexBorder) {
          r = 168;
          g = 85;
          b = 247;
        }
      }

      buffer[offset++] = r;
      buffer[offset++] = g;
      buffer[offset++] = b;
      buffer[offset++] = a;
    }
  }

  // Deflate IDAT data
  const compressed = zlib.deflateSync(buffer);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(calculateCRC(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCRC(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

// Write PNG files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, false));

console.log('All PWA icon assets generated successfully in public/');
