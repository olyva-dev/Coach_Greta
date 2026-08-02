// Generates PWA icons from an inline SVG. Run: node scripts/generate-icons.mjs
// Uses sharp, which ships as a Next.js dependency.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Shapes only, no text: a progress ring with a checkmark, dark background
function svg(padRatio) {
  const s = 512;
  const pad = s * padRatio;
  const c = s / 2;
  const r = s / 2 - pad - 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
  <rect width="${s}" height="${s}" rx="${padRatio > 0 ? 0 : 116}" fill="#131316"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#1f8a6d" stroke-width="34" opacity="0.35"/>
  <path d="M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - r * 0.866} ${c + r * 0.5}"
        fill="none" stroke="#34d39e" stroke-width="34" stroke-linecap="round"/>
  <path d="M ${c - r * 0.42} ${c + r * 0.05} l ${r * 0.3} ${r * 0.3} l ${r * 0.55} ${-r * 0.62}"
        fill="none" stroke="#e8e8ec" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const normal = Buffer.from(svg(0));
const maskable = Buffer.from(svg(0.1));

await sharp(normal).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(normal).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(normal)
  .resize(180, 180)
  .png()
  .toFile("public/icons/apple-touch-icon.png");
await sharp(maskable)
  .resize(512, 512)
  .png()
  .toFile("public/icons/icon-maskable-512.png");

console.log("icons written to public/icons");
