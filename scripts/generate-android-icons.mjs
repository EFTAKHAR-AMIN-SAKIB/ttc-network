import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcon = path.join(__dirname, '../public/icon-512.png');
const resDir = path.join(__dirname, '../android/app/src/main/res');

const densities = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
  console.log('Generating Android app launcher icons with white card backing...');

  for (const { folder, size } of densities) {
    const targetFolder = path.join(resDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const webpLauncher = path.join(targetFolder, 'ic_launcher.webp');
    const webpRound = path.join(targetFolder, 'ic_launcher_round.webp');
    if (fs.existsSync(webpLauncher)) fs.unlinkSync(webpLauncher);
    if (fs.existsSync(webpRound)) fs.unlinkSync(webpRound);

    // Inner logo scaled to ~74% of canvas so it has clean white margins
    const innerSize = Math.round(size * 0.74);
    const padding = Math.round((size - innerSize) / 2);

    const innerLogo = await sharp(sourceIcon)
      .resize(innerSize, innerSize, { fit: 'contain' })
      .png()
      .toBuffer();

    // 1. Squircle icon on pure white background
    const squircleSvg = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#ffffff" /></svg>`
    );
    await sharp(squircleSvg)
      .composite([{ input: innerLogo, top: padding, left: padding }])
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher.png'));

    // 2. Round icon on pure white circular background
    const circleSvg = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff" /></svg>`
    );
    await sharp(circleSvg)
      .composite([{ input: innerLogo, top: padding, left: padding }])
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_round.png'));

    console.log(`Generated icons for ${folder} (${size}x${size})`);
  }

  // Adaptive icon foreground (108dp canvas = 432x432 for xxxhdpi)
  // Safe zone diameter is 264px. Sizing logo to 260x260 with 86px padding places it perfectly inside.
  const drawableDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

  await sharp(sourceIcon)
    .resize(260, 260, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 86,
      bottom: 86,
      left: 86,
      right: 86,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(drawableDir, 'ic_launcher_foreground.png'));

  console.log('Generated adaptive foreground in drawable/ic_launcher_foreground.png (432x432)');
}

generateIcons().catch(console.error);
