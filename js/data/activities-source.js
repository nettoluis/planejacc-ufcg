const ACTIVITIES_DOC_URL =
  'https://docs.google.com/document/d/1bMVWyqoH0cJ7Zsz_Q_SnHOqe6UfIwPLcYsvTd9vbIYk/export?format=txt';

const DESC_RE = /^(\d+)\.\s*(.+)$/;

function parseMaxCreditos(text) {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseMinHoras(unidadeMinima) {
  if (!unidadeMinima) return null;
  const match = unidadeMinima.match(/m[ií]nima\s+de\s+(\d+)\s*h/i);
  return match ? Number(match[1]) : null;
}

// Classifies how a credit is computed from the free-text "Por Unidade
// Comprovada" column. The doc's wording is consistent enough across rows
// for these three shapes to cover every known entry.
function parseCalculo(porUnidade) {
  if (!porUnidade) return { tipoCalc: 'custom' };

  const horasMatch = porUnidade.match(/(\d+)\s*cr[eé]dito.*cada\s*15\s*horas/i);
  if (horasMatch) return { tipoCalc: 'horas', creditosPor15h: Number(horasMatch[1]) };

  const porUnidadeMatch = porUnidade.match(/^(\d+)\s*cr[eé]ditos?\b/i);
  if (porUnidadeMatch) return { tipoCalc: 'fixo', creditosPorUnidade: Number(porUnidadeMatch[1]) };

  return { tipoCalc: 'custom' };
}

function classifyCategoria(tipo) {
  const t = (tipo || '').toLowerCase();
  const extensao = t.includes('extens');
  const flexivel = t.includes('flex');
  if (extensao && flexivel) return 'outras';
  if (extensao) return 'extensao';
  if (flexivel) return 'flexivel';
  return 'outras';
}

// Fetches the complementary-hours criteria table. The doc's plain-text
// table export flattens merged cells inconsistently — the "Tipo da
// Atividade" column, merged across a run of rows sharing one category, is
// only emitted once per run. This anchors on each row's leading "N. "
// description to find record boundaries, then forward-fills the tipo
// field from the previous record when a row is short one cell, which is
// the correct reading of a merged cell rather than a workaround.
export async function fetchActivitiesFromDoc() {
  const response = await fetch(ACTIVITIES_DOC_URL);
  if (!response.ok) {
    throw new Error(`Falha ao buscar tabela de atividades complementares (${response.status})`);
  }

  const text = await response.text();
  const cells = text
    .split(/\t|\r\n|\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  const boundaries = [];
  cells.forEach((cell, i) => {
    if (DESC_RE.test(cell)) boundaries.push(i);
  });

  const records = [];
  let lastTipo = null;

  for (let b = 0; b < boundaries.length; b++) {
    const start = boundaries[b];
    const end = b + 1 < boundaries.length ? boundaries[b + 1] : cells.length;
    const chunk = cells.slice(start, end);

    const match = chunk[0].match(DESC_RE);
    const id = Number(match[1]);
    const desc = match[2].replace(/\.$/, '');
    const [unidadeMinima, porUnidade, creditosMaximosText, documentacao, tipoRaw] = chunk.slice(1);

    const tipo = tipoRaw || lastTipo;
    lastTipo = tipo;

    records.push({
      id,
      desc,
      categoria: classifyCategoria(tipo),
      ...parseCalculo(porUnidade),
      maxCreditos: parseMaxCreditos(creditosMaximosText),
      minHoras: parseMinHoras(unidadeMinima),
      doc: documentacao,
    });
  }

  return records;
}
