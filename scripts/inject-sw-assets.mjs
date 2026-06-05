import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const swPath = path.join(distDir, "sw.js");

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : fullPath;
    }),
  );
  return files.flat();
}

const files = await listFiles(path.join(distDir, "assets"));
const assets = files
  .map((file) => `/${path.relative(distDir, file).split(path.sep).join("/")}`)
  .sort();

const sw = await readFile(swPath, "utf8");
await writeFile(swPath, sw.replace("const BUILD_ASSETS = [];", `const BUILD_ASSETS = ${JSON.stringify(assets, null, 2)};`));
