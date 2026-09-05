import fs from 'fs';

let content = fs.readFileSync('README.md', 'utf8');

content = content.replace(
  '- **Three weekend sessions**: Free Practice, One-Shot Qualifying (single flying lap), 20-Lap Sprint Race.',
  '- **Weekend sessions**: Free Practice and 20-Lap Race (10-Car Grid).'
);

content = content.replace(
  '- **PeerJS 6-character room code P2P multiplayer** with ghost collision (Host↔Guest) during Qualifying and 30Hz state sync for Guest thin-client rendering.',
  '- **PeerJS 6-character room code P2P multiplayer** with 30Hz state sync for Guest thin-client rendering.'
);

content = content.replace(
  'js/session.js      Practice / Qualifying / Race state machine',
  'js/session.js      Practice / Race state machine'
);

fs.writeFileSync('README.md', content, 'utf8');
console.log('Successfully updated README.md');
