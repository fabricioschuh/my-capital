#!/usr/bin/env node
/**
 * Generates a bcrypt hash for AUTH_PASSWORD and prints the AUTH_PASSWORD_HASH value.
 * Usage:
 *   node scripts/hash-password.js
 *   node scripts/hash-password.js "my-password"
 */

const bcrypt = require('bcrypt');
const readline = require('readline');

const SALT_ROUNDS = 12;

async function main() {
  let password = process.argv[2];

  if (!password) {
    // Read from env if available
    password = process.env.AUTH_PASSWORD;
  }

  if (!password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    password = await new Promise((resolve) => {
      rl.question('Enter password to hash: ', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
  }

  if (!password) {
    console.error('No password provided.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  console.log('\nAdd this to your .env:\n');
  console.log(`AUTH_PASSWORD_HASH=${hash}`);
  console.log('\nThen you can remove the AUTH_PASSWORD line from .env.\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
