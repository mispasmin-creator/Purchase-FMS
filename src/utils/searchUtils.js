/**
 * Universal search utility that safely checks whether an item or row matches a search query.
 *
 * Features:
 * - Completely crash-safe against null, undefined, numbers, and boolean values.
 * - Multi-word searching (every word in the query must match somewhere in the item).
 * - Searches top-level fields, arrays, and shallow nested objects.
 * - Ignores React elements or complex internal references ($$typeof).
 * - Allows optional additional fields or strings to be included in the search pool.
 *
 * @param {Object} item - The data row or object to search within.
 * @param {string} query - The search query entered by the user.
 * @param {Array<any>} [extraFields=[]] - Optional additional values/fields to include.
 * @returns {boolean} True if the item matches the search query.
 */
export const matchesUniversalSearch = (item, query, extraFields = []) => {
  if (!query || typeof query !== "string" || !query.trim()) return true;
  if (item === null || item === undefined) return false;

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const strings = [];

  const extractValues = (val, depth = 0) => {
    if (val === null || val === undefined || depth > 2) return;
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      strings.push(String(val));
    } else if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        extractValues(val[i], depth + 1);
      }
    } else if (typeof val === "object") {
      if (val.$$typeof) return; // Skip React nodes
      const vals = Object.values(val);
      for (let i = 0; i < vals.length; i++) {
        extractValues(vals[i], depth + 1);
      }
    }
  };

  extractValues(item);

  if (Array.isArray(extraFields)) {
    for (let i = 0; i < extraFields.length; i++) {
      extractValues(extraFields[i]);
    }
  }

  const searchableText = strings.join(" ").toLowerCase();

  return terms.every((term) => searchableText.includes(term));
};
