import { fetchGradeCourses, fetchEquivalencias } from './grade-source.js';
import { fetchDisciplinasEnrichment } from './disciplinas-source.js';
import { fetchOfertaPlan } from './oferta-source.js';
import { FALLBACK_COURSES } from './fallback-courses.js';
import { normalizeString } from '../util/normalize.js';
import { toTitleCase } from '../util/text.js';

const fallbackCoreqsByCode = new Map(
  FALLBACK_COURSES.filter((c) => c.coreqs && c.coreqs.length).map((c) => [c.id, c.coreqs])
);

function mapCmpTipo(disciplina) {
  return /trabalho de conclus[ãa]o de curso/i.test(disciplina || '') ? 'TCC' : 'Complementar';
}

function mapTipo(row) {
  if (row.tipo === 'obr') return 'Obrigatória';
  if (row.tipo === 'opt') return 'Optativa';
  return mapCmpTipo(row.disciplina);
}

// Groups of interchangeable identifiers (codes or names) keyed by their
// normalized form, so a prereq referencing an old/renamed identifier can
// still resolve to the course that's actually in the active list.
function buildEquivalenceIndex(groups) {
  const index = new Map();
  groups.forEach((group) => {
    const keys = group.map((v) => normalizeString(v));
    keys.forEach((key) => {
      if (!index.has(key)) index.set(key, new Set());
      keys.forEach((other) => {
        if (other !== key) index.get(key).add(other);
      });
    });
  });
  return index;
}

function resolveCode(code, courseByCode, coursesByName, equivIndex) {
  if (courseByCode.has(code)) return code;

  const related = equivIndex.get(normalizeString(code));
  if (!related) return null;

  for (const candidate of related) {
    if (courseByCode.has(candidate)) return candidate;
    const byName = coursesByName.get(normalizeString(candidate));
    if (byName) return byName.id;
  }
  return null;
}

function withOfflineDefaults(course) {
  return {
    ...course,
    trilhas: course.trilhas || [],
    termsOffered: course.termsOffered || [],
    ementa: course.ementa || '',
    bibliografiaBasica: course.bibliografiaBasica || [],
    bibliografiaComplementar: course.bibliografiaComplementar || [],
    status: 'Pendente',
    // null means "unscheduled" — the course lives in the electives
    // repository column rather than a numbered period.
    customSem: course.sem ?? null,
  };
}

// Merges the four curriculum sources (grade2023, equivalências,
// disciplinas.json, plano de oferta) into the app's course list. grade2023
// is authoritative for structure; a failure there falls back to the
// bundled offline snapshot. The other three degrade independently —
// their absence only means missing enrichment (ementa, trilha, offering
// history), never a blocked app.
export async function loadCourses() {
  const [gradeResult, equivResult, disciplinasResult, ofertaResult] = await Promise.allSettled([
    fetchGradeCourses(),
    fetchEquivalencias(),
    fetchDisciplinasEnrichment(),
    fetchOfertaPlan(),
  ]);

  const warnings = [];
  [
    ['grade2023', gradeResult],
    ['equivalências', equivResult],
    ['disciplinas.json', disciplinasResult],
    ['plano de oferta de optativas', ofertaResult],
  ].forEach(([label, result]) => {
    if (result.status === 'rejected') {
      console.warn(`Falha ao sincronizar ${label}:`, result.reason);
      warnings.push(label);
    }
  });

  if (gradeResult.status === 'rejected') {
    return {
      courses: FALLBACK_COURSES.map(withOfflineDefaults),
      offline: true,
      warnings,
    };
  }

  const { active } = gradeResult.value;
  const equivGroups = equivResult.status === 'fulfilled' ? equivResult.value : [];
  const enrichment = disciplinasResult.status === 'fulfilled' ? disciplinasResult.value : [];
  const oferta = ofertaResult.status === 'fulfilled' ? ofertaResult.value : [];

  const enrichmentByName = new Map(enrichment.map((e) => [normalizeString(e.nome), e]));
  const ofertaByName = new Map(oferta.map((o) => [normalizeString(o.disciplina), o]));

  const courseByCode = new Map();
  active.forEach((row) => {
    courseByCode.set(row.codigo, {
      id: row.codigo,
      name: toTitleCase(row.disciplina),
      rawName: row.disciplina,
      cr: row.creditos,
      ch: row.horas,
      sem: /^\d+$/.test(String(row.periodo)) ? Number(row.periodo) : null,
      tipo: mapTipo(row),
      prereqCodes: row.reqs,
      liveCorr: row.corr,
      trilhas: row.trilhas,
    });
  });

  const coursesByName = new Map(
    [...courseByCode.values()].map((c) => [normalizeString(c.rawName), c])
  );
  const equivIndex = buildEquivalenceIndex(equivGroups);

  const courses = [...courseByCode.values()].map((course) => {
    const prereqs = course.prereqCodes
      .map((code) => resolveCode(code, courseByCode, coursesByName, equivIndex))
      .filter(Boolean);

    const coreqs =
      course.liveCorr !== undefined ? course.liveCorr : fallbackCoreqsByCode.get(course.id) || [];

    const enrich = enrichmentByName.get(normalizeString(course.rawName));
    const ofertaMatch = ofertaByName.get(normalizeString(course.rawName));

    return withOfflineDefaults({
      id: course.id,
      name: course.name,
      cr: course.cr,
      ch: course.ch,
      sem: course.sem,
      tipo: course.tipo,
      prereqs,
      coreqs,
      trilhas: course.trilhas.length ? course.trilhas : ofertaMatch?.trilha ? [ofertaMatch.trilha] : [],
      termsOffered: ofertaMatch?.termsOffered || [],
      ementa: enrich?.ementa || '',
      bibliografiaBasica: enrich?.bibliografiaBasica || [],
      bibliografiaComplementar: enrich?.bibliografiaComplementar || [],
    });
  });

  return { courses, offline: false, warnings };
}
