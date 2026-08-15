import fs from 'fs';

const envConfig = fs.readFileSync('./.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const splitIndex = line.indexOf('=');
    if (splitIndex !== -1) {
      const key = line.substring(0, splitIndex).trim();
      let val = line.substring(splitIndex + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/\\n/g, '\n');
      }
      process.env[key] = val;
    }
  }
});

import { getPnLData } from './lib/googleSheetsHelper.js';

async function test() {
  const data = await getPnLData();
  console.log("5 bản ghi đầu tiên:");
  console.log(data.records.slice(0, 5));
}

test();
