// Static GitHub Pages build: sets GH_PAGES=1, runs `next build`, adds .nojekyll to out/.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, GH_PAGES: "1" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// without this, Pages (Jekyll) hides the _next/ folder
writeFileSync("out/.nojekyll", "");
console.log("GitHub Pages build ready in out/");
