const http = require('http');

http.get('http://localhost:3000/', (res) => {
  console.log('SERVER STATUS:', res.statusCode);
  process.exit(0);
}).on('error', (err) => {
  console.log('SERVER NOT RUNNING:', err.message);
  process.exit(1);
});
