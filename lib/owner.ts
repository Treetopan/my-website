/**
 * The one address that is an admin without being granted it.
 *
 * This is the bootstrap. Admin is stored in the database, and a rule that only
 * ever consults the database can never grant the first one — so exactly one
 * address is written into `database.rules.json`, and everybody else is granted
 * by somebody who already has it.
 *
 * Verification is deliberately not required. Firebase Auth will not issue two
 * accounts for one address, so this address can only ever belong to whoever
 * registered it first — and requiring a verified email would lock the owner out
 * of their own admin area until they had clicked a link that email/password
 * sign-up never sends.
 *
 * It sits in a file of its own rather than in `admin.ts` because both sides of
 * the wire need it: the admin screen, to decide what to offer, and the admin
 * route, to decide what to hand over. `admin.ts` is a client module and a route
 * handler cannot import one.
 */
export const OWNER_EMAIL = "alexleyvalp@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}
