// scripts/clean.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`Removed: ${dirPath}`);
  } else {
    console.log(`Not found: ${dirPath}`);
  }
}

removeDir(path.resolve(__dirname, '../dist'));
removeDir(path.resolve(__dirname, '../build/html'));
removeDir(path.resolve(__dirname, '../build/mac/build'));
