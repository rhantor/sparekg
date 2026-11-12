/**
 * Renders the SpareKG app icons from one SVG, so the favicon, the iOS home
 * screen icon and the PWA icons can never drift apart.
 *
 *   node scripts/generate-icons.mjs
 *
 * The mark matches the in-app logo: a teal plane (lucide "plane") on navy.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const NAVY = '#0b1d33';
const TEAL = '#14b8a6';
const PLANE =
  'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';

/**
 * @param {number} radius corner radius as a share of the size (0 = square,
 *   which maskable icons need: the OS applies its own shape)
 * @param {number} glyph plane size as a share of the canvas
 */
function svg({ radius = 0.22, glyph = 0.56 } = {}) {
  const size = 512;
  const g = size * glyph;
  const offset = (size - g) / 2;
  const scale = g / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="${NAVY}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${TEAL}"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${PLANE}"/>
  </g>
</svg>`;
}

const png = (markup, size) => sharp(Buffer.from(markup)).resize(size, size).png().toBuffer();

await mkdir('public/icons', { recursive: true });

const standard = svg();
// Maskable icons are cropped to a circle or squircle by the OS; keep the plane
// inside the central safe zone (~80%) and let the navy fill the corners.
const maskable = svg({ radius: 0, glyph: 0.44 });

await writeFile('src/app/icon.svg', standard);
await writeFile('src/app/apple-icon.png', await png(svg({ radius: 0 }), 180));
await writeFile('public/icons/icon-192.png', await png(standard, 192));
await writeFile('public/icons/icon-512.png', await png(standard, 512));
await writeFile('public/icons/maskable-512.png', await png(maskable, 512));

console.log('Icons written: src/app/icon.svg, src/app/apple-icon.png, public/icons/*.png');
