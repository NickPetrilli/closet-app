/**
 * Sign-up rules shared by the auth Server Actions and the forms. They live here
 * because a "use server" file can only export async functions.
 *
 * The password minimum matches Supabase Auth's own default (6), which it
 * enforces server-side regardless of what the app allows. Keeping the two equal
 * means the form's hint and Supabase never disagree. If the setting under
 * Authentication -> Sign In / Providers -> Email is ever changed, change this
 * to match.
 */
export const MIN_PASSWORD_LENGTH = 6;

export const MAX_FIRST_NAME_LENGTH = 40;
