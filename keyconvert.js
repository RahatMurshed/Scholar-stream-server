const fs = require('fs');
const key = fs.readFileSync('./scholar-stream-firebase-admin-sdk.json', 'utf8')
const base64 = Buffer.from(key).toString('base64')
console.log(base64)