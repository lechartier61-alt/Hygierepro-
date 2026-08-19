'use strict';
const crypto = require('crypto');
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run hash-password -- "mot-de-passe-de-12-caracteres-minimum"');
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const keyLength = 64;
const hash = crypto.scryptSync(password, salt, keyLength, { N: 16384, r: 8, p: 1 });
console.log(`scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}$${keyLength}`);
