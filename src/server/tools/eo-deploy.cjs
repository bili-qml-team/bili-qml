// scripts/copy-server.js
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
// Allow passing source filename as the first CLI argument (defaults to server.js)
const srcFile = process.argv[2] || "server.js";
const src = path.join(cwd, srcFile);
const destDir = path.join(cwd, "node-functions");
const dest = path.join(destDir, "[[server]].js");

try {
  if (!fs.existsSync(src)) {
    console.error(`Cannot find source file: ${src}`);
    console.error("Usage: node eo-deploy.js [source-file]");
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);

  console.log(`Copied: ${srcFile} -> node-functions/[[server]].js`);
} catch (err) {
  console.error("Run failed: ", err);
  process.exit(1);
}
