// nodeCanvasShim.mjs
// Installs minimal browser-compatible globals that Three.js GLTFExporter
// expects when running under Node: FileReader, Blob.arrayBuffer(),
// and a polyfill for HTMLCanvasElement.toBlob() on @napi-rs/canvas canvases.

import { createCanvas as napiCreateCanvas } from '@napi-rs/canvas';

// ---- FileReader polyfill ----

class FileReaderPolyfill {
  constructor() {
    this.result = null;
    this.onloadend = null;
    this.onerror = null;
  }
  readAsArrayBuffer(blob) {
    queueMicrotask(async () => {
      try {
        let buffer;
        if (blob && typeof blob.arrayBuffer === 'function') {
          buffer = await blob.arrayBuffer();
        } else if (blob && blob._buffer) {
          buffer = blob._buffer;
        } else {
          throw new Error('FileReaderPolyfill: cannot read blob');
        }
        this.result = buffer;
        if (this.onloadend) this.onloadend();
      } catch (e) {
        if (this.onerror) this.onerror(e);
      }
    });
  }
  readAsDataURL(blob) {
    queueMicrotask(async () => {
      try {
        let buffer;
        if (blob && typeof blob.arrayBuffer === 'function') {
          buffer = Buffer.from(await blob.arrayBuffer());
        } else if (blob && blob._buffer) {
          buffer = blob._buffer;
        } else {
          throw new Error('FileReaderPolyfill: cannot read blob');
        }
        this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + buffer.toString('base64');
        if (this.onloadend) this.onloadend();
      } catch (e) {
        if (this.onerror) this.onerror(e);
      }
    });
  }
}

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = FileReaderPolyfill;
}

// ---- Blob enhancement: ensure .arrayBuffer() exists on Node's Blob ----

const _NativeBlob = globalThis.Blob;
if (_NativeBlob && !_NativeBlob.prototype.arrayBuffer) {
  _NativeBlob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const chunks = [];
      this.on('data', (c) => chunks.push(c));
      this.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks)).buffer));
      this.on('error', reject);
    });
  };
}

// ---- ImageData polyfill ----

if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

// ---- Canvas factory ----

export function createCanvas(width, height) {
  const canvas = napiCreateCanvas(width, height);

  if (typeof canvas.toBlob !== 'function') {
    canvas.toBlob = function (cb, mimeType = 'image/png', quality) {
      try {
        const opts = mimeType === 'image/jpeg' || mimeType === 'image/webp'
          ? { quality: quality ?? 0.92 }
          : {};
        const buf = canvas.toBuffer(mimeType, opts);
        const blob = new _NativeBlob([buf], { type: mimeType });
        cb(blob);
      } catch (e) {
        cb(null);
      }
    };
  }

  return canvas;
}

// ---- document polyfill ----
// GLTFExporter's getCanvas() does `document.createElement('canvas')` when neither
// OffscreenCanvas nor document-less detection succeeds. Provide a minimal
// document object that returns our canvas factory.

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return createCanvas(1, 1);
      return {};
    },
    createElementNS(_ns, tag) {
      return this.createElement(tag);
    }
  };
}
