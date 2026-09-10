import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Phone SVG for standard icon
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <path filter="url(#shadow)" d="M152 128c20 0 32 24 38.4 36.8 4.8 10.4 3.2 21.6-4.8 29.6l-16 16c30.4 60.8 79.2 109.6 140 140l16-16c8-8 19.2-9.6 29.6-4.8 12.8 6.4 36.8 18.4 36.8 38.4 0 26.4-20.8 48-46.4 48-101.6 0-184-82.4-184-184 0-25.6 21.6-46.4 48-46.4z" fill="#ffffff"/>
</svg>
`;

// Maskable icon with safe-zone padding (minimum 10% padding for circular/squircle mask)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(64, 64) scale(0.75)">
    <path filter="url(#shadow)" d="M152 128c20 0 32 24 38.4 36.8 4.8 10.4 3.2 21.6-4.8 29.6l-16 16c30.4 60.8 79.2 109.6 140 140l16-16c8-8 19.2-9.6 29.6-4.8 12.8 6.4 36.8 18.4 36.8 38.4 0 26.4-20.8 48-46.4 48-101.6 0-184-82.4-184-184 0-25.6 21.6-46.4 48-46.4z" fill="#ffffff"/>
  </g>
</svg>
`;

async function generate() {
  const standardBuffer = Buffer.from(standardSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  await sharp(standardBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(standardBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(standardBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(standardBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));

  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(maskableBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-maskable-192.png'));

  console.log('Successfully generated all PWA PNG icons in public/ directory!');
}

generate().catch(console.error);
