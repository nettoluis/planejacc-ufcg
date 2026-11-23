import { parseCsv } from '../util/csv.js';

const OFERTA_PUB_ID =
  '2PACX-1vQ_8x2t-axjpAuCsQzT0qU56AV07_aR-P6VG3_-RDnDPCsd6C2m9s9T4hnfguc2m-c0XMNHtEILt98L';
const OFERTA_GID = '172287965';
const OFERTA_URL = `https://docs.google.com/spreadsheets/d/e/${OFERTA_PUB_ID}/pub?gid=${OFERTA_GID}&single=true&output=csv`;

const TERM_RE = /^(\d+)\.(\d+)(?:\s+(\S+))?$/;

// Term columns look like "28.1", "26.2 EXE", "26.2 PLA" or "26.1":
//   - "EXE" marks what was actually executed in that term;
//   - "PLA" is what had been planned for that term (superseded by EXE);
//   - a column holding enrollment counts (numbers) is a past term;
//   - any term after the latest executed one is a forecast (previsão).
// Columns that don't parse as a term are ignored.
export function classifyTermColumns(termLabels, dataRows, firstTermIndex) {
  const columns = termLabels.map((label, i) => {
    const term = label.trim();
    const match = TERM_RE.exec(term);
    if (!match) return { term, kind: 'unknown' };

    const key = Number(match[1]) * 10 + Number(match[2]);
    const suffix = (match[3] || '').toUpperCase();
    const hasCounts = dataRows.some((cells) =>
      /^\d+$/.test((cells[firstTermIndex + i] || '').trim())
    );
    const executed = suffix === 'EXE' || (!suffix && hasCounts);
    return { term, key, suffix, executed };
  });

  const latestExecuted = Math.max(
    -Infinity,
    ...columns.filter((c) => c.executed).map((c) => c.key)
  );

  return columns.map((c) => {
    if (c.kind === 'unknown') return c;
    if (c.executed) return { ...c, kind: 'past' };
    if (c.key > latestExecuted) return { ...c, kind: 'forecast' };
    return { ...c, kind: 'superseded' };
  });
}

const byTermAsc = (a, b) => a.key - b.key;

// Fetches the elective offering plan: which past terms each elective was
// offered in (most recent first, like the sheet), which upcoming terms it
// is forecast to be offered in (earliest first), plus its trilha (track).
export async function fetchOfertaPlan() {
  const response = await fetch(OFERTA_URL);
  if (!response.ok) {
    throw new Error(`Falha ao buscar plano de oferta de optativas (${response.status})`);
  }

  const text = await response.text();
  return parseOfertaCsv(text);
}

export function parseOfertaCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const FIRST_TERM = 3;
  const [header, ...allRows] = rows;
  const dataRows = allRows.filter((cells) => (cells[1] || '').trim());
  const columns = classifyTermColumns(header.slice(FIRST_TERM), dataRows, FIRST_TERM);

  return dataRows.map((cells) => {
    const disciplina = cells[1].trim();
    const trilhaRaw = (cells[2] || '').trim();
    const trilha = trilhaRaw && trilhaRaw !== '---' ? trilhaRaw : null;

    const marked = columns.filter((c, i) => (cells[FIRST_TERM + i] || '').trim().length > 0);

    const termsOffered = marked.filter((c) => c.kind === 'past').map((c) => c.term);
    const forecastTerms = marked
      .filter((c) => c.kind === 'forecast')
      .sort(byTermAsc)
      .map((c) => c.term);

    return { disciplina, trilha, termsOffered, forecastTerms };
  });
}
