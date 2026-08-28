const LOWERCASE_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'a', 'o', 'as', 'os', 'à', 'ao', 'aos',
]);

// Best-effort title-casing for the ALL-CAPS course names coming from the
// live sheet. Purely cosmetic — small imperfections (e.g. abbreviations
// glued together with a period, like "ADM.DE") are an acceptable trade-off
// for not hand-curating every name.
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (!word) return word;
      if (i > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
