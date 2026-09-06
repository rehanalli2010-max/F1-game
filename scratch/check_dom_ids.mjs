import fs from 'fs';

const main = fs.readFileSync('./js/main.js', 'utf8');
const html = fs.readFileSync('./index.html', 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const missing = [];

while ((match = regex.exec(main)) !== null) {
  const id = match[1];
  const hasInHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!hasInHtml && !missing.includes(id)) {
    // Check if dynamically created or touch element
    missing.push(id);
  }
}

console.log('Missing or dynamically created element IDs:', missing);
