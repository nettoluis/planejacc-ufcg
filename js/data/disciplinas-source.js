const DISCIPLINAS_JSON_URL =
  'https://raw.githubusercontent.com/daltonserey/ppc-2023-em-dados/refs/heads/master/dados/disciplinas.json';

// Fetches descriptive enrichment only (ementa, bibliografia). Curriculum
// structure (code, period, type, prereqs) comes from grade-source.js, which
// is the authoritative source — this file's prerequisitos field is not
// used for prereq/coreq logic.
export async function fetchDisciplinasEnrichment() {
  const response = await fetch(DISCIPLINAS_JSON_URL);
  if (!response.ok) {
    throw new Error(`Falha ao buscar disciplinas.json (${response.status})`);
  }

  const data = await response.json();
  return data.map((d) => ({
    nome: d.nome,
    ementa: d.ementa || '',
    bibliografiaBasica: d.bibliografia_basica || [],
    bibliografiaComplementar: d.bibliografia_complementar || [],
    cargaHoraria: d.carga_horaria,
  }));
}
