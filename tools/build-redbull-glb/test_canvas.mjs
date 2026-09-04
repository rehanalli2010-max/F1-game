import { createCanvas } from '@napi-rs/canvas';
const c = createCanvas(64, 64);
const ctx = c.getContext('2d');
ctx.fillStyle = '#ff0000';
ctx.fillRect(0, 0, 64, 64);
// Test ImageData support
try {
  const img = ctx.getImageData(0, 0, 64, 64);
  console.log('getImageData OK', img.data.length, img.data[0], img.data[1], img.data[2], img.data[3]);
  // mutate and put back
  img.data[0] = 0;
  img.data[1] = 255;
  img.data[2] = 0;
  ctx.putImageData(img, 0, 0);
  console.log('putImageData OK');
  // Test creating a Buffer
  const buf = c.toBuffer('image/png');
  console.log('toBuffer OK', buf.length);
} catch (e) {
  console.log('FAIL', e.message);
}
