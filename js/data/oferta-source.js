import { parseCsv } from '../util/csv.js';

const OFERTA_PUB_ID =
  '2PACX-1vQ_8x2t-axjpAuCsQzT0qU56AV07_aR-P6VG3_-RDnDPCsd6C2m9s9T4hnfguc2m-c0XMNHtEILt98L';
const OFERTA_GID = '172287965';
const OFERTA_URL = `https://docs.google.com/spreadsheets/d/e/${OFERTA_PUB_ID}/pub?gid=${OFERTA_GID}&single=true&output=csv`;

// Fetches the elective offering plan: which terms (columns like "28.1",
// "26.2 EXE") each elective has been offered in, plus its trilha (track).
// Returns rows in the sheet's own most-recent-first column order.
export async function fetchOfertaPlan() {
  const response = await fetch(OFERTA_URL);
  if (!response.ok) {
    throw new Error(`Falha ao buscar plano de oferta de optativas (${response.status})`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  const termLabels = header.slice(3);

  return dataRows
    .filter((cells) => (cells[1] || '').trim())
    .map((cells) => {
      const disciplina = cells[1].trim();
      const trilhaRaw = (cells[2] || '').trim();
      const trilha = trilhaRaw && trilhaRaw !== '---' ? trilhaRaw : null;

      const termsOffered = termLabels
        .map((term, i) => ({ term: term.trim(), raw: (cells[3 + i] || '').trim() }))
        .filter((t) => t.raw.length > 0)
        .map((t) => t.term);

      return { disciplina, trilha, termsOffered };
    });
}
