// Generate maskable icon from icon-512.png
// Scales content to 80% (center safe zone) with background fill
const sharp = require("sharp");
const path = require("path");

const inputPath = path.join(__dirname, "..", "public", "icon-512.png");
const outputPath = path.join(__dirname, "..", "public", "icon-maskable-512.png");

const CANVAS_SIZE = 512;
const SAFE_ZONE = 0.8; // Content occupies 80% of canvas
const CONTENT_SIZE = Math.round(CANVAS_SIZE * SAFE_ZONE); // 410px
const OFFSET = Math.round((CANVAS_SIZE - CONTENT_SIZE) / 2); // 51px

async function generate() {
  // Get the original icon's pixel data, resized to fit safe zone
  const resizedContent = await sharp(inputPath)
    .resize(CONTENT_SIZE, CONTENT_SIZE, {
      fit: "contain",
      background: { r: 192, g: 57, b: 43, alpha: 1 }, // --primary #C0392B
    })
    .png()
    .toBuffer();

  // Create a 512x512 canvas with brand primary background, composite content centered
  await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 192, g: 57, b: 43, alpha: 1 }, // #C0392B
    },
  })
    .composite([
      {
        input: resizedContent,
        left: OFFSET,
        top: OFFSET,
      },
    ])
    .png()
    .toFile(outputPath);

  console.log(`✅ Maskable icon generated: ${outputPath}`);
  console.log(`   Canvas: ${CANVAS_SIZE}x${CANVAS_SIZE}`);
  console.log(`   Content: ${CONTENT_SIZE}x${CONTENT_SIZE} (${SAFE_ZONE * 100}% safe zone)`);
  console.log(`   Offset: ${OFFSET}px from each edge`);
}

generate().catch((err) => {
  console.error("❌ Failed to generate maskable icon:", err);
  process.exit(1);
});
