/**
 * A selection of subunits — what a student actually sits down to practise.
 *
 * A unit's subunits are small, and the useful session is usually a mix of a
 * few of them rather than one drilled alone, so every game takes a *list* of
 * subunit ids rather than one. The list travels in the URL as a single `s`
 * parameter with the ids comma-separated: subunit ids never contain a comma,
 * and one parameter keeps an invitation link the same shape it has always had.
 */

/**
 * As many subunits as one session will mix. Past four each one gets a question
 * or two, which is a tour of the unit rather than practice at anything in it.
 */
export const MAX_SUBUNITS = 4;

export function encodeSelection(subunitIds: string[]): string {
  return subunitIds.map(encodeURIComponent).join(",");
}

/**
 * Reads a selection out of a query parameter, however it arrived — one comma
 * separated `s`, or a repeated one. Duplicates are dropped and the list is
 * capped here, because everything downstream takes this list as already clean.
 */
export function parseSelection(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const out: string[] = [];

  for (const part of raw.flatMap((v) => v.split(","))) {
    const id = part.trim();
    if (id && !out.includes(id)) out.push(id);
  }

  return out.slice(0, MAX_SUBUNITS);
}
