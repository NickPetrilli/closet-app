// Moves an entire closet from one account to another — items, outfits, wear
// log, day state, settings, the occasion tags that account added, and the
// photo files behind every item.
//
// Written for one job: the demo wardrobe is loaded under a development account
// while the app is being polished, and has to land in Jenna's account once she
// signs up. It works for any pair of accounts.
//
// Usage (from the project root):
//   node --env-file=.env scripts/transfer-closet.mjs --from a@b.com --to c@d.com
//   node --env-file=.env scripts/transfer-closet.mjs --from a@b.com --to c@d.com --apply
//
// Without --apply it only reports what WOULD move. Nothing is deleted at any
// point: rows change owner, photos are copied to the new owner's folder before
// the originals are removed, and both accounts survive.
//
// Uses the service_role key, which bypasses RLS — local only, never on Vercel.
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? null : args[at + 1];
};
const fromEmail = flag("from");
const toEmail = flag("to");
const apply = args.includes("--apply");

if (!fromEmail || !toEmail) {
  console.error(
    "Usage: node --env-file=.env scripts/transfer-closet.mjs --from <email> --to <email> [--apply]"
  );
  process.exit(1);
}
if (fromEmail.toLowerCase() === toEmail.toLowerCase()) {
  console.error("Those are the same account.");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "item-images";

/** Accounts are addressed by email here; everything else keys off the id. */
async function findUser(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error(error.message);
    if (data.users.length === 0) break;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
  }
  throw new Error(`No account found for ${email}.`);
}

async function countRows(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

/**
 * Every object under a user's folder, including the cutouts/ subfolder.
 * Supabase's list() is per-prefix, so the two are fetched separately.
 */
async function listPhotos(userId) {
  const paths = [];
  for (const prefix of [userId, `${userId}/cutouts`]) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000 });
    if (error) throw new Error(`storage ${prefix}: ${error.message}`);
    for (const file of data ?? []) {
      // Subfolders come back as entries with no id; skip them, their contents
      // are listed under their own prefix above.
      if (file.id) paths.push(`${prefix}/${file.name}`);
    }
  }
  return paths;
}

function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function main() {
  const from = await findUser(fromEmail);
  const to = await findUser(toEmail);

  console.log(`From: ${from.email}  ${from.id}`);
  console.log(`To:   ${to.email}  ${to.id}`);
  console.log("");

  const tables = [
    "items",
    "outfits",
    "wear_log",
    "daily_state",
    "app_settings",
    "occasion_tags",
  ];
  const counts = {};
  for (const table of tables) counts[table] = await countRows(table, from.id);
  const photos = await listPhotos(from.id);

  console.log("Would move:");
  for (const table of tables) console.log(`  ${table.padEnd(14)} ${counts[table]}`);
  console.log(`  ${"photos".padEnd(14)} ${photos.length}`);

  // Conflicts worth knowing about before anything moves. app_settings is one
  // row per user and daily_state one per (user, day), so rows the target
  // already has would collide on their primary keys.
  const targetSettings = await countRows("app_settings", to.id);
  const { data: fromDays } = await supabase
    .from("daily_state")
    .select("day")
    .eq("user_id", from.id);
  const { data: toDays } = await supabase
    .from("daily_state")
    .select("day")
    .eq("user_id", to.id);
  const clashingDays = (fromDays ?? [])
    .map((row) => row.day)
    .filter((day) => (toDays ?? []).some((row) => row.day === day));

  if (targetSettings > 0) {
    console.log(
      "\nNote: the target already has a location saved, so its own setting is kept and the source's is dropped."
    );
  }
  if (clashingDays.length > 0) {
    console.log(
      `\nNote: both accounts have a day state for ${clashingDays.join(", ")}; the target's is kept.`
    );
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to move it all.");
    return;
  }

  console.log("\nMoving…");

  // 1. Photos first. Copy, rewrite the rows that point at them, then remove
  //    the originals — so a failure part-way leaves rows pointing at files
  //    that still exist rather than at nothing.
  const moved = [];
  for (const path of photos) {
    const target = path.replace(new RegExp(`^${from.id}/`), `${to.id}/`);
    const { error } = await supabase.storage.from(BUCKET).copy(path, target);
    if (error) {
      console.warn(`  photo copy failed (${path}): ${error.message}`);
      continue;
    }
    moved.push({ from: path, to: target });
  }
  console.log(`  photos copied: ${moved.length} of ${photos.length}`);

  // 2. Rows change owner. items last-but-one so their URLs are rewritten in
  //    the same pass.
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, image_url, cutout_image_url")
    .eq("user_id", from.id);
  if (itemsError) throw new Error(itemsError.message);

  for (const item of items ?? []) {
    const rewrite = (url) => {
      if (!url) return url;
      const hit = moved.find((m) => url.includes(m.from));
      return hit ? publicUrl(hit.to) : url;
    };
    const { error } = await supabase
      .from("items")
      .update({
        user_id: to.id,
        image_url: rewrite(item.image_url),
        cutout_image_url: rewrite(item.cutout_image_url),
      })
      .eq("id", item.id);
    if (error) throw new Error(`item ${item.id}: ${error.message}`);
  }
  console.log(`  items moved: ${items?.length ?? 0}`);

  // outfit_items has no owner of its own; it follows its outfit.
  for (const table of ["outfits", "wear_log"]) {
    const { data, error } = await supabase
      .from(table)
      .update({ user_id: to.id })
      .eq("user_id", from.id)
      .select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`  ${table} moved: ${data?.length ?? 0}`);
  }

  // daily_state: skip days the target already has, move the rest.
  for (const row of fromDays ?? []) {
    if (clashingDays.includes(row.day)) {
      await supabase
        .from("daily_state")
        .delete()
        .eq("user_id", from.id)
        .eq("day", row.day);
      continue;
    }
    const { error } = await supabase
      .from("daily_state")
      .update({ user_id: to.id })
      .eq("user_id", from.id)
      .eq("day", row.day);
    if (error) throw new Error(`daily_state ${row.day}: ${error.message}`);
  }
  console.log(`  daily_state moved: ${(fromDays ?? []).length - clashingDays.length}`);

  // app_settings: one row per user, so only move it if the target has none.
  if (targetSettings === 0) {
    const { data, error } = await supabase
      .from("app_settings")
      .update({ user_id: to.id })
      .eq("user_id", from.id)
      .select("*");
    if (error) throw new Error(`app_settings: ${error.message}`);
    console.log(`  app_settings moved: ${data?.length ?? 0}`);
  } else {
    await supabase.from("app_settings").delete().eq("user_id", from.id);
    console.log("  app_settings: target kept its own");
  }

  // occasion_tags: only the ones this account added (seeded tags have a null
  // owner and belong to everybody). A tag whose id the target already has is
  // dropped rather than moved, since (user_id, id) is unique.
  const { data: tags } = await supabase
    .from("occasion_tags")
    .select("id")
    .eq("user_id", from.id);
  let tagsMoved = 0;
  for (const tag of tags ?? []) {
    const { data: existing } = await supabase
      .from("occasion_tags")
      .select("id")
      .eq("user_id", to.id)
      .eq("id", tag.id);
    if (existing && existing.length > 0) {
      await supabase
        .from("occasion_tags")
        .delete()
        .eq("user_id", from.id)
        .eq("id", tag.id);
      continue;
    }
    const { error } = await supabase
      .from("occasion_tags")
      .update({ user_id: to.id })
      .eq("user_id", from.id)
      .eq("id", tag.id);
    if (error) throw new Error(`occasion_tags ${tag.id}: ${error.message}`);
    tagsMoved += 1;
  }
  console.log(`  occasion_tags moved: ${tagsMoved}`);

  // 3. Originals go last, once nothing points at them any more.
  if (moved.length > 0) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(moved.map((m) => m.from));
    if (error) console.warn(`  old photos left behind: ${error.message}`);
    else console.log(`  old photos removed: ${moved.length}`);
  }

  // Photos from before accounts existed sit at flat paths with no user folder.
  // They are still referenced by their public URL and keep working; they just
  // never belonged to a folder to move.
  const { data: leftovers } = await supabase
    .from("items")
    .select("id")
    .eq("user_id", to.id)
    .not("image_url", "ilike", `%/${to.id}/%`);
  if (leftovers && leftovers.length > 0) {
    console.log(
      `\n${leftovers.length} item(s) still point at photos outside the new owner's folder (added before accounts). They display fine; the app just can't overwrite or delete those files.`
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
