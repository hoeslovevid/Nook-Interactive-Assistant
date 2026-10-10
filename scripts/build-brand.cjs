// Rasterize the vector sources locally with Electron. No network or extra dependencies.
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const zlib = require('node:zlib');
app.setPath('userData', path.join(root, 'dist', 'brand-renderer'));

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(image => image.png)]);
}

function bmp(png) {
  const image = nativeImage.createFromBuffer(png);
  const { width, height } = image.getSize();
  const pixels = image.toBitmap(); // BGRA, top to bottom.
  const stride = Math.ceil(width * 3 / 4) * 4;
  const result = Buffer.alloc(54 + stride * height);
  result.write('BM');
  result.writeUInt32LE(result.length, 2);
  result.writeUInt32LE(54, 10);
  result.writeUInt32LE(40, 14);
  result.writeInt32LE(width, 18);
  result.writeInt32LE(height, 22);
  result.writeUInt16LE(1, 26);
  result.writeUInt16LE(24, 28);
  result.writeUInt32LE(stride * height, 34);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const input = (y * width + x) * 4;
      pixels.copy(result, 54 + (height - y - 1) * stride + x * 3, input, input + 3);
    }
  }
  return result;
}

// Apple app icons require RGB PNGs with no alpha channel, even when pixels are opaque.
function rgbPng(png) {
  const image = nativeImage.createFromBuffer(png), { width, height } = image.getSize(), pixels = image.toBitmap();
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const input = (y * width + x) * 4, output = y * (width * 3 + 1) + 1 + x * 3;
    if (pixels[input + 3] !== 255) throw new Error('The native app icon must be fully opaque');
    rows[output] = pixels[input + 2]; rows[output + 1] = pixels[input + 1]; rows[output + 2] = pixels[input];
  }
  function chunk(type, data) {
    const body = Buffer.concat([Buffer.from(type), data]), result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length); body.copy(result, 4); let crc = 0xffffffff;
    for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4); return result;
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    await window.loadURL('data:text/html,<html><body></body></html>');
    async function raster(svg, width, height = width, opaque = false) {
      const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
      const data = await window.webContents.executeJavaScript(`(async () => {
        const image = new Image(); image.src = ${JSON.stringify(uri)}; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = ${width}; canvas.height = ${height};
        canvas.getContext('2d', {alpha: ${!opaque}}).drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png').split(',')[1];
      })()`);
      return Buffer.from(data, 'base64');
    }
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');
    const save = (file, data) => fs.writeFileSync(path.join(root, file), data);
    const icon = read('assets/icon.svg'), mark = read('assets/logo.svg'), tray = read('assets/tray.svg');
    const frames = [];
    for (const size of [16, 20, 24, 32, 48, 64, 128, 256]) frames.push({ size, png: await raster(icon, size) });
    save('build/icon.ico', ico(frames));
    save('assets/favicon.ico', ico(frames));
    save('assets/icon.png', await raster(icon, 512));
    save('assets/logo.png', await raster(mark, 512));
    for (const [scale, suffix] of [[1, ''], [2, '@2x'], [3, '@3x']]) save(`assets/tray${suffix}.png`, await raster(tray, 16 * scale));
    // The operating system supplies the home-screen mask; fill every source pixel.
    const touch = icon.replace('<rect x="8" y="8" width="240" height="240" rx="56"', '<rect x="0" y="0" width="256" height="256" rx="0"');
    save('assets/apple-touch-icon.png', await raster(touch, 180));
    const phoneIcon = path.join(root, 'ios/Assets.xcassets/AppIcon.appiconset');
    if (fs.existsSync(phoneIcon)) save('ios/Assets.xcassets/AppIcon.appiconset/AppIcon.png', rgbPng(await raster(touch, 1024, 1024, true)));
    save('build/installer-sidebar.bmp', bmp(await raster(read('build/installer-sidebar.svg'), 164, 314)));
    console.log('Logo, app icon, eight ICO sizes, three tray scales, phone icon, and installer artwork generated.');
  } catch (error) {
    console.error(error); process.exitCode = 1;
  } finally {
    window.destroy(); app.quit();
  }
});
