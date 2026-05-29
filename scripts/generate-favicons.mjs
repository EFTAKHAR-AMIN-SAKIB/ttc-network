/**
 * generate-favicons.mjs
 * 
 * Generates all required favicon/icon files from a single source logo.
 * 
 * Usage:
 *   node scripts/generate-favicons.mjs
 * 
 * To update the site icon in the future:
 *   1. Replace public/logo.png with your new logo
 *   2. Run: npm run generate-favicons
 *   3. Commit & deploy
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "public", "logo.png");
const APP_DIR = join(ROOT, "src", "app");

// Ensure output directories exist
mkdirSync(APP_DIR, { recursive: true });

/**
 * Generate a PNG icon at a specific size
 */
async function generatePng(size, outputPath) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${outputPath} (${size}x${size})`);
}

/**
 * Generate a favicon.ico (contains 16x16 and 32x32 bitmaps)
 * We create a proper ICO file by writing the binary format manually.
 */
async function generateIco(outputPath) {
  const sizes = [16, 32, 48];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(SOURCE)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  // ICO file format:
  // Header: 6 bytes (reserved=0, type=1 for ICO, count=N)
  // Directory entries: 16 bytes each
  // Image data: PNG buffers
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * pngBuffers.length;
  let dataOffset = headerSize + dirSize;

  // Build header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);                // Reserved
  header.writeUInt16LE(1, 2);                // Type: 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // Count

  // Build directory entries
  const dirEntries = Buffer.alloc(dirSize);
  for (let i = 0; i < pngBuffers.length; i++) {
    const { size, buf } = pngBuffers[i];
    const offset = i * dirEntrySize;
    dirEntries.writeUInt8(size < 256 ? size : 0, offset);      // Width
    dirEntries.writeUInt8(size < 256 ? size : 0, offset + 1);  // Height
    dirEntries.writeUInt8(0, offset + 2);                       // Color palette
    dirEntries.writeUInt8(0, offset + 3);                       // Reserved
    dirEntries.writeUInt16LE(1, offset + 4);                    // Color planes
    dirEntries.writeUInt16LE(32, offset + 6);                   // Bits per pixel
    dirEntries.writeUInt32LE(buf.length, offset + 8);           // Image size
    dirEntries.writeUInt32LE(dataOffset, offset + 12);          // Image offset
    dataOffset += buf.length;
  }

  // Combine all parts
  const ico = Buffer.concat([header, dirEntries, ...pngBuffers.map(p => p.buf)]);
  writeFileSync(outputPath, ico);
  console.log(`  ✓ ${outputPath} (ICO with ${sizes.join(", ")}px)`);
}

async function main() {
  console.log("🎨 Generating favicons from public/logo.png...\n");

  // 1. favicon.ico → src/app/favicon.ico (Next.js auto-serves this)
  await generateIco(join(APP_DIR, "favicon.ico"));

  // 2. icon.png → src/app/icon.png (Next.js auto-serves as /icon.png)
  //    192x192 is the standard web app icon size
  await generatePng(192, join(APP_DIR, "icon.png"));

  // 3. apple-icon.png → src/app/apple-icon.png (Next.js auto-serves as /apple-icon.png)
  //    180x180 is the Apple standard
  await generatePng(180, join(APP_DIR, "apple-icon.png"));

  // 4. Additional sizes for web manifest / PWA
  await generatePng(16, join(ROOT, "public", "icon-16.png"));
  await generatePng(32, join(ROOT, "public", "icon-32.png"));
  await generatePng(192, join(ROOT, "public", "icon-192.png"));
  await generatePng(512, join(ROOT, "public", "icon-512.png"));

  console.log("\n✅ All favicons generated successfully!");
  console.log("\n📋 To update icons in the future:");
  console.log("   1. Replace public/logo.png with the new logo");
  console.log("   2. Run: npm run generate-favicons");
  console.log("   3. Commit & deploy\n");
}

main().catch((err) => {
  console.error("❌ Error generating favicons:", err);
  process.exit(1);
});
