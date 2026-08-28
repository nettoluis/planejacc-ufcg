import { fetchActivitiesFromDoc } from './activities-source.js';
import { FALLBACK_ACTIVITIES } from './fallback-activities.js';

const overlayById = new Map(FALLBACK_ACTIVITIES.map((a) => [a.id, a]));

// The criteria doc drives the rules that actually affect credit math
// (categoria, tipoCalc, credit rates, caps, minimum hours, documentation
// text). unidadeLabel and obs are cosmetic wording the doc's prose doesn't
// cleanly separate out as structured data, so those stay a small local
// overlay keyed by activity id.
export async function loadActivities() {
  try {
    const records = await fetchActivitiesFromDoc();
    if (!records.length) throw new Error('Tabela de atividades veio vazia');

    const activities = records.map((record) => {
      const overlay = overlayById.get(record.id) || {};
      return {
        id: record.id,
        categoria: record.categoria,
        desc: record.desc,
        tipoCalc: record.tipoCalc,
        creditosPor15h: record.creditosPor15h,
        creditosPorUnidade: record.creditosPorUnidade,
        unidadeLabel: overlay.unidadeLabel,
        maxCreditos: record.maxCreditos ?? overlay.maxCreditos,
        minHoras: record.minHoras ?? overlay.minHoras,
        doc: record.doc || overlay.doc,
        obs: overlay.obs,
      };
    });

    return { activities, offline: false };
  } catch (error) {
    console.warn('Falha ao sincronizar tabela de atividades complementares:', error);
    return { activities: FALLBACK_ACTIVITIES, offline: true };
  }
}
