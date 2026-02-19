
const http = require('http');

function check(port, path) {
    const options = {
        hostname: 'localhost',
        port: port,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify({ username: 'admin', password: 'wrongpassword' }))
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(`Port ${port} ${path}: Status ${res.statusCode}`);
            console.log(`Body: ${data}`);
        });
    });

    req.on('error', (e) => {
        console.error(`Port ${port} ${path}: Error ${e.message}`);
    });

    req.write(JSON.stringify({ username: 'admin', password: 'wrongpassword' }));
    req.end();
}

console.log('Checking backend directly (8000)...');
check(8000, '/api/v1/public/auth/login');

console.log('Checking via proxy (5173)...');
check(5173, '/api/v1/public/auth/login');
