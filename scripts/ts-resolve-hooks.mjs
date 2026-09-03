// Module resolution hooks so the verification scripts can import the app's
// own TypeScript modules directly under `node --experimental-strip-types`.
//
// Two gaps to close between Node's ESM resolver and the app's tsconfig:
//   1. "@/lib/x" — the project's path alias, which Node knows nothing about.
//   2. extensionless relative specifiers — idiomatic in TS, but ESM requires
//      a real filename.
//
// Without this, testing a pure module would mean either adding
// allowImportingTsExtensions to the whole project or keeping a paraphrase of
// the logic in the script, and a paraphrase is exactly what these scripts
// exist to avoid.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "src");
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];

/** First existing candidate for a path that may be missing its extension. */
function withExtension(basePath) {
  if (existsSync(basePath) && !basePath.endsWith("/")) return basePath;
  for (const ext of EXTENSIONS) {
    if (existsSync(basePath + ext)) return basePath + ext;
  }
  for (const ext of EXTENSIONS) {
    const indexPath = resolvePath(basePath, `index${ext}`);
    if (existsSync(indexPath)) return indexPath;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const found = withExtension(resolvePath(SRC, specifier.slice(2)));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const found = withExtension(resolvePath(parentDir, specifier));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }

  return next(specifier, context);
}
