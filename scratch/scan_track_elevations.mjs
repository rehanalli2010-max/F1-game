import fs from 'node:fs';

const content = fs.readFileSync('js/tracks_db.js', 'utf8');
const trackBlocks = content.split(/id:\s*['"]([a-z_0-9]+)['"]/g);

for (let i = 1; i < trackBlocks.length; i += 2) {
  const id = trackBlocks[i];
  const block = trackBlocks[i + 1];
  const vecMatches = [...block.matchAll(/Vector3\s*\(\s*([^,\)]+),\s*([^,\)]+),\s*([^\)]+)\)/g)];
  const yVals = vecMatches.map(m => parseFloat(m[2]));
  const minY = Math.min(...yVals);
  const maxY = Math.max(...yVals);
  console.log(`Track [${id}]: minY = ${minY}, maxY = ${maxY}, points = ${yVals.length}`);
}
