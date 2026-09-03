// Entry point for the resolution hooks — use with:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs <script>
// See ts-resolve-hooks.mjs for what it does and why.
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
