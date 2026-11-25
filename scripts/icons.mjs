import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
await mkdir('public/icons',{recursive:true});
// Provisional typographic app icon, not an official brand asset.
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="64" fill="#122f36"/><text x="256" y="295" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="128" fill="#eed7a3">HUB</text></svg>`;
for(const size of [192,512])await sharp(Buffer.from(svg)).resize(size,size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from(svg)).png().toFile('public/icons/maskable-512.png');
