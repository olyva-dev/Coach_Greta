// Generates the app mark and every icon size from one vector source.
// Run: node scripts/generate-icons.mjs
//
// The mark is a "G" built as a progress ring: the ring is the app's core
// visual (day completion, session timer), and the gap plus crossbar read as
// a G. Geometry only, no text and no emoji, so it stays sharp at 16px.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const VOLT = "#d2ff00";
const DARK = "#111510";

// Ring geometry on a 64x64 canvas
const C = 32;
const R = 21;
const STROKE = 9;
const rad = (deg) => (deg * Math.PI) / 180;
const pt = (deg) => [
  (C + R * Math.cos(rad(deg))).toFixed(2),
  (C + R * Math.sin(rad(deg))).toFixed(2),
];

// Arc sweeps counter-clockwise from the upper right, all the way around,
// stopping short on the lower right to leave the G's opening.
const [sx, sy] = pt(-34);
const [ex, ey] = pt(34);
const barInnerX = (C + 6).toFixed(2);

const markPath = [
  `M ${sx} ${sy}`,
  `A ${R} ${R} 0 1 0 ${ex} ${ey}`, // large arc, counter-clockwise
  `L ${ex} ${C}`, // up into the crossbar
  `L ${barInnerX} ${C}`, // crossbar pointing back to centre
].join(" ");

function mark({ background, padding = 0 }) {
  const scale = (64 - padding * 2) / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${background ? `<rect width="64" height="64" rx="14" fill="${background}"/>` : ""}
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <path d="${markPath}" fill="none" stroke="${VOLT}" stroke-width="${STROKE}"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

// Maskable icons get a safe zone: Android crops up to 20% off the edges
function maskable() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="${DARK}"/>
  <g transform="translate(11 11) scale(0.656)">
    <path d="${markPath}" fill="none" stroke="${VOLT}" stroke-width="${STROKE}"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

// Favicon: SVG, so it stays crisp at every size. Next.js App Router serves
// app/icon.svg as the favicon automatically.
await writeFile("app/icon.svg", mark({ background: DARK }));

// In-app logo, transparent so it inherits whatever sits behind it
await writeFile("public/icons/mark.svg", mark({ background: null }));

const rounded = Buffer.from(mark({ background: DARK }));
const flat = Buffer.from(maskable());

await sharp(rounded).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(rounded).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(flat).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
// iOS never rounds its own corners for web apps, so ship the rounded square
await sharp(rounded).resize(180, 180).png().toFile("app/apple-icon.png");

console.log("wrote app/icon.svg, app/apple-icon.png, public/icons/*");
