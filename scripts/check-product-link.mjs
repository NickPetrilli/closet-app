// Checks the product-link fetch against real retailer pages, without touching
// the database, remove.bg or the Gemini quota: it runs the REAL
// fetchProductFromUrl and prints what came back.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs \
//     --env-file=.env scripts/check-product-link.mjs <url> [<url>...]
//
// A visible browser window opens off-screen for each page; that is the point
// (see the comment in src/lib/server/product-fetch.ts). Local only.
import { fetchProductFromUrl } from "@/lib/server/product-fetch";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Pass one or more product URLs.");
  process.exit(1);
}

for (const url of urls) {
  const host = new URL(url).hostname;
  try {
    const product = await fetchProductFromUrl(url);
    console.log(
      `PASS  ${host}\n      name:     ${product.name}\n      category: ${product.category ?? "(not detected — the form asks)"}\n      photo:    ${Math.round(product.buffer.length / 1024)} KB ${product.contentType}`
    );
  } catch (err) {
    console.log(`FAIL  ${host}\n      ${err.message}`);
  }
}
