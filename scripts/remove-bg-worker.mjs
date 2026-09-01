// Runs in its own process, deliberately never imports `sharp` — loading
// sharp and @imgly/background-removal-node in the same Node process
// segfaults on this Windows setup (native library conflict). Usage:
//   node scripts/remove-bg-worker.mjs <inputPath> <outputPath>
// Paths must be relative to the cwd the process is launched from; an
// absolute path or file:// URL also crashes this library on Windows.
import { removeBackground } from "@imgly/background-removal-node";
import { writeFileSync } from "node:fs";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("usage: remove-bg-worker.mjs <inputPath> <outputPath>");
  process.exit(1);
}

const blob = await removeBackground(inputPath);
writeFileSync(outputPath, Buffer.from(await blob.arrayBuffer()));
