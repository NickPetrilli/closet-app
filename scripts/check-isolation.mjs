// Account isolation check: proves one signed-in person can't see or change
// another person's closet. Run from the project root:
//   node --env-file=.env scripts/check-isolation.mjs
//
// How it works:
//   1. Creates two throwaway accounts (closet-isolation-<timestamp>-a/b@...)
//      with the service_role admin API.
//   2. Signs each one in through its own anon-key client, so every request
//      below goes out exactly like the app's signed-in requests.
//   3. As A: adds 3 items, an outfit with its links, a wear log row, a day
//      state row, a settings row, a personal occasion tag, and a photo at
//      item-images/<A id>/iso-test.png.
//   4. As B (and as a signed-out anon client): tries to read, change, delete
//      and pin into A's data, and records PASS/FAIL for each attempt. Also
//      checks A can read its own rows, so an over-strict policy shows up too.
//   5. ALWAYS deletes everything it made (photos, rows, both accounts), then
//      verifies through the admin client that nothing is left.
//
// Before 004-accounts-rls.sql runs, RLS is off and the database lets B do all
// of this, so those checks FAIL by design (the app code does the scoping); the
// script says so up front and exits 0 unless A can't read its own data or
// something broke. After 004, every check must pass or it exits 1.
//
// This runs against the real database, so it only ever touches rows, photos
// and accounts it created. Its rows are named "[isolation test <timestamp>]"
// and dated in 1900-1954, so the few seconds they exist don't touch anyone's
// recent wear history. Accounts left behind by a run that was killed midway
// are found by their email pattern and removed at the start of the next run.
//
// Uses both keys: service_role (local only, never on Vercel) for setup and
// cleanup, the anon key for everything that is being tested.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(url, serviceKey, clientOptions);

const BUCKET = "item-images";
const TABLES_WITH_OWNER = [
  "items",
  "outfits",
  "wear_log",
  "daily_state",
  "app_settings",
  "occasion_tags",
];
const ts = Date.now();
const MARK = `[isolation test ${ts}]`;
const TAG_ID = `iso-${ts}`;
const PASSWORD = randomBytes(18).toString("base64url");
// Emails matching this are this script's accounts and nobody else's.
const THROWAWAY_EMAIL = /^closet-isolation-\d{13}-[ab]@/i;
// example.com is reserved for exactly this; the others are only tried if the
// project's auth settings reject it.
const EMAIL_DOMAINS = ["example.com", "example.org", "closet-isolation.invalid"];
// A 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

// Everything created, so cleanup knows what to remove even after a crash.
const created = { users: [], paths: [], outfitIds: [], itemIds: [] };

// ---------------------------------------------------------------------------
// Result recording.
// ---------------------------------------------------------------------------
// requiredWhenRlsOff: true for checks that hold with or without RLS (A reading
// its own data, everyone seeing the seeded tags). The rest are database-level
// isolation checks, which only count once RLS is on.
const results = [];

async function check(name, requiredWhenRlsOff, fn) {
  try {
    const { pass, detail } = await fn();
    results.push({ name, requiredWhenRlsOff, pass, detail });
  } catch (err) {
    results.push({ name, requiredWhenRlsOff, pass: false, detail: `threw: ${err.message}` });
  }
}

/** PASS when the query errored or came back empty. */
function hidden({ data, error }) {
  if (error) return { pass: true, detail: `denied: ${error.message}` };
  const n = data?.length ?? 0;
  return { pass: n === 0, detail: n === 0 ? "0 rows" : `${n} row(s) visible` };
}

/** Unwraps a setup step, throwing with context on failure. */
function must(step, { data, error }) {
  if (error) throw new Error(`${step}: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Accounts.
// ---------------------------------------------------------------------------
async function createThrowawayUser(suffix, firstName) {
  let lastError;
  for (const domain of EMAIL_DOMAINS) {
    const email = `closet-isolation-${ts}-${suffix}@${domain}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: firstName },
    });
    if (!error) {
      created.users.push(data.user.id);
      if (domain !== EMAIL_DOMAINS[0]) {
        console.log(`Note: Supabase rejected @${EMAIL_DOMAINS[0]}; using ${email} instead.`);
      }
      return data.user;
    }
    lastError = error;
    // Only an email complaint is worth retrying with another domain.
    if (!/email/i.test(error.message)) break;
  }
  throw new Error(`creating user ${suffix}: ${lastError.message}`);
}

async function signedInClient(email) {
  const client = createClient(url, anonKey, clientOptions);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signing in ${email}: ${error.message}`);
  return client;
}

async function listThrowawayUsers() {
  const found = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listing users: ${error.message}`);
    found.push(...data.users.filter((u) => THROWAWAY_EMAIL.test(u.email ?? "")));
    if (data.users.length < 1000) break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// Cleanup (admin client). Returns true when nothing is left behind.
// ---------------------------------------------------------------------------
async function cleanup(userIds, extraPaths = []) {
  let clean = true;
  const say = (msg) => console.log(`  ${msg}`);
  const bucket = admin.storage.from(BUCKET);

  // 1. Photos first: an account that still owns storage objects can refuse
  //    to delete.
  const paths = new Set(extraPaths);
  for (const id of userIds) {
    const { data, error } = await bucket.list(id, { limit: 1000 });
    if (error) say(`WARNING listing ${id}/: ${error.message}`);
    for (const f of data ?? []) paths.add(`${id}/${f.name}`);
  }
  if (paths.size) {
    const { error } = await bucket.remove([...paths]);
    if (error) say(`WARNING removing photos: ${error.message}`);
  }
  let photosLeft = 0;
  for (const id of userIds) {
    const { data } = await bucket.list(id, { limit: 1000 });
    photosLeft += data?.length ?? 0;
  }
  say(`photos: removed ${paths.size} path(s), ${photosLeft} left`);
  if (photosLeft) clean = false;

  // 2. The personal occasion tag(s).
  if (userIds.length) {
    const { data, error } = await admin
      .from("occasion_tags")
      .delete()
      .in("user_id", userIds)
      .select("id");
    if (error) say(`WARNING deleting occasion tags: ${error.message}`);
    else say(`occasion tags: deleted ${data.length}`);
  }

  // 3. The accounts; their rows go with them (on delete cascade).
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && !/not found/i.test(error.message)) {
      say(`WARNING deleting user ${id}: ${error.message}`);
      clean = false;
    }
  }
  let usersLeft = 0;
  for (const id of userIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user) usersLeft++;
  }
  say(`accounts: deleted ${userIds.length - usersLeft} of ${userIds.length}`);
  if (usersLeft) clean = false;

  // 4. Verify the cascade; delete anything it missed.
  if (userIds.length) {
    const leftovers = [];
    for (const table of TABLES_WITH_OWNER) {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .in("user_id", userIds);
      if (error) {
        say(`WARNING counting ${table}: ${error.message}`);
        clean = false;
      } else if (count) {
        await admin.from(table).delete().in("user_id", userIds);
        const { count: after } = await admin
          .from(table)
          .select("*", { count: "exact", head: true })
          .in("user_id", userIds);
        leftovers.push(`${table} ${count}→${after ?? "?"}`);
        if (after !== 0) clean = false;
      }
    }
    // outfit_items has no owner column; check the links this run made.
    for (const [column, ids] of [
      ["outfit_id", created.outfitIds],
      ["item_id", created.itemIds],
    ]) {
      if (!ids.length) continue;
      const { count } = await admin
        .from("outfit_items")
        .select("*", { count: "exact", head: true })
        .in(column, ids);
      if (count) {
        await admin.from("outfit_items").delete().in(column, ids);
        leftovers.push(`outfit_items ${count}`);
      }
    }
    say(
      leftovers.length
        ? `rows: cascade missed some, deleted explicitly (${leftovers.join(", ")})`
        : "rows: none left in any table"
    );
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
let setupFailed = false;
let cleanupOk = true;
let rlsOn = false;

try {
  // Leftovers from a run that was killed before its cleanup.
  const stale = await listThrowawayUsers();
  if (stale.length) {
    console.log(`Removing ${stale.length} account(s) left by an earlier interrupted run:`);
    if (!(await cleanup(stale.map((u) => u.id)))) {
      throw new Error("could not clear the earlier run's leftovers");
    }
  }

  // --- 1-2. Accounts and signed-in clients. ---------------------------------
  const userA = await createThrowawayUser("a", "Iso A");
  const userB = await createThrowawayUser("b", "Iso B");
  const a = await signedInClient(userA.email);
  const b = await signedInClient(userB.email);
  const anon = createClient(url, anonKey, clientOptions);
  console.log(`Created and signed in ${userA.email} and ${userB.email}.`);

  // --- 4. Seed A's closet, through A's own client. -------------------------
  // Reuse a real photo URL so a page load during the run doesn't hit a broken
  // image; any https URL satisfies the schema.
  const { data: sample } = await admin.from("items").select("image_url").limit(1);
  const imageUrl = sample?.[0]?.image_url ?? "https://example.com/closet-isolation.png";

  // Before 004, daily_state's primary key is `day` alone, so pick a date no
  // real row uses.
  let farDay;
  for (let n = ts % 20000; ; n++) {
    farDay = new Date(Date.UTC(1900, 0, 1) + n * 86400000).toISOString().slice(0, 10);
    const { count } = await admin
      .from("daily_state")
      .select("*", { count: "exact", head: true })
      .eq("day", farDay);
    if (!count) break;
  }

  const itemsA = must(
    "A inserting items",
    await a
      .from("items")
      .insert(
        ["tops", "bottoms", "shoes"].map((category) => ({
          user_id: userA.id,
          name: `${MARK} ${category}`,
          category,
          primary_color_hex: "#8fb4d9",
          image_url: imageUrl,
        }))
      )
      .select("id, name")
  );
  const itemIds = itemsA.map((i) => i.id);
  created.itemIds.push(...itemIds);

  const [outfitA] = must(
    "A inserting outfit",
    await a
      .from("outfits")
      .insert({ user_id: userA.id, name: `${MARK} outfit`, vibe: "weekend" })
      .select("id")
  );
  created.outfitIds.push(outfitA.id);

  must(
    "A inserting outfit_items",
    await a
      .from("outfit_items")
      .insert(itemIds.map((item_id, position) => ({ outfit_id: outfitA.id, item_id, position })))
      .select("outfit_id")
  );

  const [wearA] = must(
    "A inserting wear_log",
    await a
      .from("wear_log")
      .insert({
        user_id: userA.id,
        outfit_id: outfitA.id,
        item_ids: itemIds,
        worn_on: farDay,
        occasion_tag: TAG_ID,
      })
      .select("id")
  );

  must(
    "A inserting daily_state",
    await a
      .from("daily_state")
      .insert({ user_id: userA.id, day: farDay, occasion_tag: TAG_ID })
      .select("day")
  );

  must(
    "A inserting app_settings",
    await a
      .from("app_settings")
      .insert({ user_id: userA.id, location_label: MARK })
      .select("user_id")
  );

  must(
    "A inserting occasion tag",
    await a
      .from("occasion_tags")
      .insert({ id: TAG_ID, user_id: userA.id, label: "Isolation test" })
      .select("id")
  );

  const photoA = `${userA.id}/iso-test.png`;
  created.paths.push(photoA);
  must(
    "A uploading photo",
    await a.storage.from(BUCKET).upload(photoA, PNG, { contentType: "image/png" })
  );
  console.log("Seeded A's closet (3 items, outfit, wear log, day, settings, tag, photo).");

  // --- 3. Is RLS on? --------------------------------------------------------
  // Asked after seeding, about A's own items, so an empty table can't be
  // mistaken for a locked one.
  const probe = await anon.from("items").select("id").in("id", itemIds);
  rlsOn = Boolean(probe.error) || probe.data.length === 0;
  console.log("");
  console.log(
    rlsOn
      ? "=== RLS ON ==="
      : "=== RLS OFF (pre-004): database-level checks are expected to FAIL; app-level isolation is enforced in code ==="
  );
  console.log(
    `    (signed-out anon reading A's items: ${
      probe.error ? `denied: ${probe.error.message}` : `${probe.data.length} row(s)`
    })`
  );
  console.log("");

  // --- 5a. A can read everything it owns. -----------------------------------
  const countIs = (expected) => ({ data, error }) =>
    error
      ? { pass: false, detail: error.message }
      : { pass: data.length === expected, detail: `${data.length} of ${expected} row(s)` };

  await check("A reads own items", true, async () =>
    countIs(3)(await a.from("items").select("id").in("id", itemIds))
  );
  await check("A reads own outfit", true, async () =>
    countIs(1)(await a.from("outfits").select("id").eq("id", outfitA.id))
  );
  await check("A reads own outfit_items", true, async () =>
    countIs(3)(await a.from("outfit_items").select("item_id").eq("outfit_id", outfitA.id))
  );
  await check("A reads own wear_log", true, async () =>
    countIs(1)(await a.from("wear_log").select("id").eq("id", wearA.id))
  );
  await check("A reads own daily_state", true, async () =>
    countIs(1)(await a.from("daily_state").select("day").eq("user_id", userA.id))
  );
  await check("A reads own app_settings", true, async () =>
    countIs(1)(await a.from("app_settings").select("user_id").eq("user_id", userA.id))
  );
  await check("A reads own occasion tag", true, async () =>
    countIs(1)(
      await a.from("occasion_tags").select("id").eq("id", TAG_ID).eq("user_id", userA.id)
    )
  );
  await check("A downloads own photo (storage API)", true, async () => {
    const { data, error } = await a.storage.from(BUCKET).download(photoA);
    return error
      ? { pass: false, detail: error.message }
      : { pass: data.size === PNG.length, detail: `${data.size} bytes` };
  });

  // --- 5b. B can't read A's data. -------------------------------------------
  await check("B reads A's items", false, async () =>
    hidden(await b.from("items").select("id").in("id", itemIds))
  );
  await check("B reads A's outfit", false, async () =>
    hidden(await b.from("outfits").select("id").eq("id", outfitA.id))
  );
  await check("B reads A's outfit_items", false, async () =>
    hidden(await b.from("outfit_items").select("item_id").eq("outfit_id", outfitA.id))
  );
  await check("B reads A's wear_log", false, async () =>
    hidden(await b.from("wear_log").select("id").eq("id", wearA.id))
  );
  await check("B reads A's daily_state", false, async () =>
    hidden(await b.from("daily_state").select("day").eq("user_id", userA.id))
  );
  await check("B reads A's app_settings", false, async () =>
    hidden(await b.from("app_settings").select("user_id").eq("user_id", userA.id))
  );
  await check("B reads A's occasion tag", false, async () =>
    hidden(await b.from("occasion_tags").select("id").eq("id", TAG_ID))
  );

  await check("B sees the seeded occasion tags", true, async () => {
    const all = must(
      "admin reading seeded tags",
      await admin.from("occasion_tags").select("id").is("user_id", null)
    );
    const { data, error } = await b.from("occasion_tags").select("id").is("user_id", null);
    if (error) return { pass: false, detail: error.message };
    const hasWork = data.some((t) => t.id === "work");
    return {
      pass: all.length > 0 && data.length === all.length && hasWork,
      detail: `${data.length} of ${all.length} visible${hasWork ? " (incl. 'work')" : ", 'work' missing"}`,
    };
  });

  await check("Signed-out anon reads items", false, async () =>
    hidden(await anon.from("items").select("id").limit(1))
  );

  // --- 5c. B can't write into A's closet. -----------------------------------
  // No .select() on these inserts, so a rejection can only come from the
  // insert itself; the admin read confirms nothing slipped through.
  await check("B inserts item owned by A", false, async () => {
    const name = `${MARK} inserted by B`;
    const { error } = await b.from("items").insert({
      user_id: userA.id,
      name,
      category: "tops",
      primary_color_hex: "#000000",
      image_url: imageUrl,
    });
    const landed = must(
      "admin checking B's insert",
      await admin.from("items").select("id").eq("name", name)
    );
    created.itemIds.push(...landed.map((r) => r.id));
    if (landed.length) return { pass: false, detail: "row created under A's id" };
    return { pass: Boolean(error), detail: error ? `rejected: ${error.message}` : "no error, no row" };
  });

  await check("B links A's item into B's outfit", false, async () => {
    const [outfitB] = must(
      "B creating its own outfit",
      await b
        .from("outfits")
        .insert({ user_id: userB.id, name: `${MARK} B outfit`, vibe: "street" })
        .select("id")
    );
    created.outfitIds.push(outfitB.id);
    const { error } = await b
      .from("outfit_items")
      .insert({ outfit_id: outfitB.id, item_id: itemIds[0], position: 0 });
    const landed = must(
      "admin checking B's link",
      await admin.from("outfit_items").select("item_id").eq("outfit_id", outfitB.id)
    );
    if (landed.length) return { pass: false, detail: "link row created" };
    return { pass: Boolean(error), detail: error ? `rejected: ${error.message}` : "no error, no row" };
  });

  await check("B uploads into A's photo folder", false, async () => {
    const path = `${userA.id}/b-intrusion.png`;
    created.paths.push(path);
    const { error } = await b.storage
      .from(BUCKET)
      .upload(path, PNG, { contentType: "image/png" });
    const { data: listing } = await admin.storage.from(BUCKET).list(userA.id);
    const landed = (listing ?? []).some((f) => f.name === "b-intrusion.png");
    if (landed) return { pass: false, detail: "object created in A's folder" };
    return { pass: Boolean(error), detail: error ? `rejected: ${error.message}` : "no error, no object" };
  });

  await check("B uploads into its own photo folder", false, async () => {
    const path = `${userB.id}/ok.png`;
    created.paths.push(path);
    const { error } = await b.storage
      .from(BUCKET)
      .upload(path, PNG, { contentType: "image/png" });
    return error ? { pass: false, detail: error.message } : { pass: true, detail: "uploaded" };
  });

  // --- 5d. B can't change or delete A's rows (run last: pre-004 they work). -
  await check("B renames A's item", false, async () => {
    const { data, error } = await b
      .from("items")
      .update({ name: `${MARK} renamed by B` })
      .eq("id", itemIds[0])
      .select("id");
    const [row] = must(
      "admin re-reading A's item",
      await admin.from("items").select("name").eq("id", itemIds[0])
    );
    const unchanged = row?.name === itemsA[0].name;
    const affected = error ? `denied: ${error.message}` : `${data.length} row(s) affected`;
    return {
      pass: unchanged && (Boolean(error) || data.length === 0),
      detail: `${affected}; name ${unchanged ? "unchanged" : "CHANGED"}`,
    };
  });

  await check("B deletes A's outfit", false, async () => {
    const { data, error } = await b
      .from("outfits")
      .delete()
      .eq("id", outfitA.id)
      .select("id");
    const still = must(
      "admin re-reading A's outfit",
      await admin.from("outfits").select("id").eq("id", outfitA.id)
    );
    const affected = error ? `denied: ${error.message}` : `${data.length} row(s) affected`;
    return {
      pass: still.length === 1 && (Boolean(error) || data.length === 0),
      detail: `${affected}; outfit ${still.length ? "still there" : "GONE"}`,
    };
  });
} catch (err) {
  setupFailed = true;
  console.error(`\nSetup failed: ${err.message}`);
} finally {
  // --- 6. Results. ----------------------------------------------------------
  if (results.length) {
    const counted = (r) => rlsOn || r.requiredWhenRlsOff;
    const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
    const rows = results.map((r, i) => [
      String(i + 1),
      r.pass ? "PASS" : counted(r) ? "FAIL" : "FAIL*",
      r.name,
      clip(r.detail, 72),
    ]);
    const header = ["#", "Result", "Check", "Detail"];
    const widths = header.map((h, c) => Math.max(h.length, ...rows.map((row) => row[c].length)));
    const line = (cells) => cells.map((cell, c) => cell.padEnd(widths[c])).join("  ").trimEnd();
    console.log(line(header));
    console.log(line(widths.map((w) => "-".repeat(w))));
    rows.forEach((row) => console.log(line(row)));

    const passed = results.filter((r) => r.pass).length;
    const failed = results.length - passed;
    const unexpected = results.filter((r) => !r.pass && counted(r)).length;
    if (!rlsOn && failed > unexpected) {
      console.log("* expected with RLS off (before 004-accounts-rls.sql)");
    }
    console.log(
      `\nSummary: ${results.length} checks, ${passed} passed, ${failed} failed ` +
        `(${failed - unexpected} expected, ${unexpected} unexpected). RLS ${rlsOn ? "ON" : "OFF"}.`
    );
    process.exitCode = unexpected ? 1 : 0;
  }

  // --- 7. Cleanup, always. --------------------------------------------------
  console.log("\nCleaning up:");
  try {
    // Also sweep by email, in case a createUser call succeeded without the
    // script getting the id back.
    const byEmail = (await listThrowawayUsers()).map((u) => u.id);
    const ids = [...new Set([...created.users, ...byEmail])];
    cleanupOk = await cleanup(ids, created.paths);
  } catch (err) {
    cleanupOk = false;
    console.error(`  cleanup error: ${err.message}`);
  }
  console.log(
    cleanupOk
      ? "Cleanup complete: no test accounts, rows or photos remain."
      : "Cleanup INCOMPLETE: see warnings above and remove leftovers by hand."
  );
  if (setupFailed || !cleanupOk) process.exitCode = 1;
}
