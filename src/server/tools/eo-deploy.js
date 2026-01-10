// scripts/copy-server.js
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const src = path.join(cwd, "server-ioredis.js");
const destDir = path.join(cwd, "node-functions");
const dest = path.join(destDir, "[[server]].js");

try {
  if (!fs.existsSync(src)) {
    console.error(`Cannot find source file: ${src}`);
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);

  console.log(`Copied: server.js -> node-functions/[[server]].js`);
} catch (err) {
  console.error("Run failed: ", err);
  process.exit(1);
}
