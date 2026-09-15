/**
 * Sign-up rules shared by the auth Server Actions and the forms. They live here
 * because a "use server" file can only export async functions.
 *
 * Deliberately lenient: a family app with a handful of accounts behind a
 * family-code gate, where a short password is the owner's explicit choice.
 * Supabase Auth enforces its OWN minimum on top of this, 6 by default. Lower it
 * under Authentication -> Sign In / Providers -> Email -> "Minimum password
 * length", or Supabase rejects 4- and 5-character passwords that pass here.
 */
export const MIN_PASSWORD_LENGTH = 4;

export const MAX_FIRST_NAME_LENGTH = 40;
