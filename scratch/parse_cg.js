const fs = require('fs');

const raw = fs.readFileSync('scratch/next_data.json', 'utf8');
const data = JSON.parse(raw);

const game = data?.props?.pageProps?.game;
if (game) {
  console.log('Game title:', game.title);
  console.log('Game slug:', game.slug);
  console.log('Developer:', game.developer);
  console.log('Game files / links:');
  console.log('gameFile:', game.gameFile);
  console.log('gameFiles:', JSON.stringify(game.gameFiles, null, 2));
  console.log('images:', JSON.stringify(game.images, null, 2));
  console.log('videos:', JSON.stringify(game.videos, null, 2));
  console.log('tagNames:', game.tags?.map(t => t.name));
  console.log('Controls / description:', game.description);
} else {
  console.log('No game object found, top keys:', Object.keys(data?.props?.pageProps || {}));
}
