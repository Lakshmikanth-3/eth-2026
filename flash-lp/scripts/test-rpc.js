const https = require('https');

const rpcUrl = "https://sepolia.base.org";
const data = JSON.stringify({
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Testing RPC: ${rpcUrl}`);

const req = https.request(rpcUrl, options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            console.log("Response:", json);
            if (json.result) {
                console.log(`✅ RPC Working! Block Number: ${parseInt(json.result, 16)}`);
            } else {
                console.error("❌ RPC Error:", json);
            }
        } catch (e) {
            console.error("❌ Failed to parse response:", body);
        }
    });
});

req.on('error', (error) => {
    console.error("❌ Request Error:", error);
});

req.write(data);
req.end();
