// Shared by the local scripts that need to act for one account: resolves an
// email to its Supabase Auth user. Needs a service_role client, because the
// admin API is how a script (with no signed-in session) finds a user.
//
// Not a script on its own — imported by seed-items, set-password and the
// check-* scripts.

/** The auth user with this email (case-insensitive), or throws. */
export async function findUserByEmail(supabase, email) {
  const wanted = email.trim().toLowerCase();
  // listUsers is paginated; a family app has a handful of accounts, but walk
  // the pages anyway so this can't silently miss someone.
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`listing users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  throw new Error(
    `No account with the email "${email}". Check Supabase → Authentication → Users.`
  );
}
