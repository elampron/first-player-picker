import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const files = ["index.html", "styles.css", "src"];

const index = await readFile(resolve(root, "index.html"), "utf8");
if (!index.includes('./src/app.js') || !index.includes('./styles.css')) {
  throw new Error("Static entry point is missing a required local asset reference.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) {
  await cp(resolve(root, file), resolve(dist, file), { recursive: true });
}
await writeFile(resolve(dist, ".nojekyll"), "");
console.log("Built static First Up site to dist/.");
