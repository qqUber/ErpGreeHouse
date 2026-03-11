const http = require('http');

const BASE_URL = "http://localhost:8000";

function check(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${url}: ${res.statusCode}`);
        if (res.statusCode !== 200) {
          console.log(`Response: ${data}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`${url}: Error ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  console.log("Checking endpoints...");
  await check(`${BASE_URL}/api/v1/public/status`);
  await check(`${BASE_URL}/api/v1/public/auth/status`);
}

run();
