import { fetchGvizSheet } from './gviz.js';
import { normalizeString } from '../util/normalize.js';

const GRADE_SHEET_ID = '1eMhue4891tuD8pUGYlB2fWpWXDtbGE2IEyNEgy28pHM';
const GRADE_TAB = 'grade2023';
const EQUIVALENCIAS_TAB = 'equivalências';

// Rows like "Optativa 1".."Optativa 11" are generic elective credit slots
// tied to a period, not individual named courses — they're not displayed.
const PLACEHOLDER_ELECTIVE_RE = /^optativa\s+\d+$/i;

// "ATIVIDADES COMPLEMENTARES FLEXIVEIS" / "...DE EXTENSAO" ARE shown as
// regular course cards: the official academic system integralizes
// complementary/flexible hours as two distinct disciplines, exactly like
// this sheet models them. The "Horas Complementares" tab is the tool for
// accumulating toward each one's minimum; marking the corresponding
// discipline card Concluída is what actually integralizes the credits.

function parseCodes(field) {
  if (field === null || field === undefined) return [];
  return String(field).trim().split(/\s+/).filter(Boolean);
}

// The sheet sometimes lists the same course twice under two different
// codigos (e.g. a recodification that never got cleaned up) — keep the
// first occurrence and fold the other's reqs/trilhas into it rather than
// showing the same course twice.
function dedupeByName(rows) {
  const byName = new Map();
  const result = [];
  for (const row of rows) {
    const key = normalizeString(row.disciplina || '');
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, row);
      result.push(row);
      continue;
    }
    if (!existing.reqs.length && row.reqs.length) existing.reqs = row.reqs;
    if (!existing.trilhas.length && row.trilhas.length) existing.trilhas = row.trilhas;
  }
  return result;
}

// Fetches the live curriculum structure: course code, period, type,
// credits, hours, prerequisites and (when present) co-requisites.
//
// The `corr` (co-requisite) column returns `undefined` when the sheet has
// no data at all for that course, as opposed to `[]` when the sheet
// explicitly reports zero co-requisites — callers use this distinction to
// decide whether to fall back to locally-known co-requisite pairs.
export async function fetchGradeCourses() {
  const { cols, rows } = await fetchGvizSheet(GRADE_SHEET_ID, GRADE_TAB);
  const idx = Object.fromEntries(cols.map((label, i) => [label, i]));

  const parsed = rows
    .map((row) => {
      const corrField = row[idx.corr];
      return {
        codigo: String(row[idx.codigo] ?? '').trim(),
        periodo: row[idx.periodo],
        tipo: row[idx.tipo],
        disciplina: row[idx.disciplina],
        creditos: Number(row[idx.creditos]) || 0,
        horas: Number(row[idx.horas]) || 0,
        reqs: parseCodes(row[idx.reqs]),
        corr: corrField === null || corrField === undefined ? undefined : parseCodes(corrField),
        trilhas: row[idx.trilhas]
          ? String(row[idx.trilhas]).trim().split(/\s+/).filter(Boolean)
          : [],
      };
    })
    .filter((c) => c.codigo);

  const active = dedupeByName(
    parsed.filter((c) => c.tipo !== '---' && !PLACEHOLDER_ELECTIVE_RE.test(c.disciplina || ''))
  );
  const legacy = parsed.filter((c) => c.tipo === '---');

  return { active, legacy };
}

// Fetches course-code/name equivalencies (renamed or recoded courses) as
// loose equivalence groups: each row's non-empty cells are treated as
// interchangeable identifiers. The tab's exact authoring convention isn't
// fully known, so this is intentionally permissive — callers should treat
// a parse failure here as non-fatal (see courses.js).
export async function fetchEquivalencias() {
  const { rows } = await fetchGvizSheet(GRADE_SHEET_ID, EQUIVALENCIAS_TAB, { headerRow: false });

  const groups = [];
  for (const row of rows) {
    const values = row
      .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
      .filter(Boolean);
    if (values.length > 1) groups.push(values);
  }
  return groups;
}
