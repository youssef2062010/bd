import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const apiUrl = process.env.BRANDING_API_URL || 'http://localhost:3000/api/branding';
const response = await fetch(apiUrl, { cache: 'no-store' });
if (!response.ok) throw new Error(`Branding API returned ${response.status}: ${apiUrl}`);
const branding = await response.json();
const appName = String(branding.appName || 'Phone').trim();
const iconDataUrl = branding.appIconUrl || '';
const iconBuffer = iconDataUrl
    ? (iconDataUrl.startsWith('data:')
        ? Buffer.from(iconDataUrl.replace(/^data:image\/[^;]+;base64,/, ''), 'base64')
        : Buffer.from(await (await fetch(iconDataUrl)).arrayBuffer()))
    : Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" rx="220" fill="#10b981"/><path d="M310 260c45 0 72 54 86 83 11 24 7 49-11 67l-36 36c36 68 90 122 158 158l36-36c18-18 43-22 67-11 29 14 83 41 83 86 0 59-47 108-105 108-228 0-413-185-413-413 0-58 49-105 108-105z" fill="white"/></svg>`);

const write = async (file, content) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
};

const androidRoot = path.join(root, 'fake-call-app/android/app/src/main/res');
const androidSizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(androidSizes)) {
    const output = await sharp(iconBuffer).resize(size, size, { fit: 'cover' }).png().toBuffer();
    for (const name of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_classic', 'ic_launcher_minimal']) {
        const file = path.join(androidRoot, `mipmap-${density}`, `${name}.png`);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, output);
    }
}
await write(path.join(androidRoot, 'values/strings.xml'), `<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">${appName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string></resources>\n`);

const iosIconSet = path.join(root, 'fake-call-app/ios/FakeCallApp/Assets.xcassets/AppIcon.appiconset');
const iosEntries = [];
const iosIcons = [
    ['20x20', 20, 2], ['20x20', 20, 3], ['29x29', 29, 2], ['29x29', 29, 3],
    ['40x40', 40, 2], ['40x40', 40, 3], ['60x60', 60, 2], ['60x60', 60, 3], ['1024x1024', 1024, 1]
];
for (const [sizeName, pointSize, scale] of iosIcons) {
    const pixelSize = pointSize * scale;
    const fileName = `AppIcon-${pixelSize}.png`;
    await fs.mkdir(iosIconSet, { recursive: true });
    await fs.writeFile(path.join(iosIconSet, fileName), await sharp(iconBuffer).resize(pixelSize, pixelSize, { fit: 'cover' }).png().toBuffer());
    iosEntries.push({ idiom: 'ios', size: `${sizeName}`, scale: `${scale}x`, filename: fileName });
}
await write(path.join(iosIconSet, 'Contents.json'), JSON.stringify({ images: iosEntries, info: { author: 'xcode', version: 1 } }, null, 2));

const plistPath = path.join(root, 'fake-call-app/ios/FakeCallApp/Info.plist');
let plist = await fs.readFile(plistPath, 'utf8');
const escapedName = appName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
plist = plist.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${escapedName}$2`);
await fs.writeFile(plistPath, plist);
console.log(`Prepared native branding: ${appName}`);