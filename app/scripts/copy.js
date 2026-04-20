// scripts/copy.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname を ESM で再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`Copied from ${src} to ${dest}`);
}

const srcDir = path.resolve(__dirname, '../dist');
const destDir = path.resolve(__dirname, '../build/html');

copyRecursive(srcDir, destDir);
