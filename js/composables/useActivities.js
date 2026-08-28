const { reactive, ref, computed, onMounted, watch } = Vue;
import { loadActivities } from '../data/activities.js';
import { useModal } from './useModal.js';
import { loadSession, saveSession } from '../data/session-storage.js';

export function useActivities() {
  const { showModal } = useModal();

  const activities = reactive([]);
  const activitiesLoading = ref(true);
  const activitiesOffline = ref(false);

  const myActivities = reactive([]);
  const form = reactive({
    activityId: '',
    amount: 1,
    customCategory: 'extensao',
  });

  onMounted(async () => {
    const saved = loadSession();
    const { activities: loaded, offline } = await loadActivities();
    activities.push(...loaded);
    activitiesOffline.value = offline;
    activitiesLoading.value = false;

    if (saved?.myActivities?.length) {
      myActivities.push(...saved.myActivities);
    }

    // Autosaves registered activities to this browser so they survive a
    // reload — no explicit save action.
    watch(
      myActivities,
      () => {
        saveSession({ myActivities: myActivities.map((a) => ({ ...a })) });
      },
      { deep: true }
    );
  });

  const selectedActivity = computed(() => {
    if (!form.activityId) return null;
    return activities.find((a) => a.id === form.activityId);
  });

  const extensaoCredits = computed(() => {
    let total = 0;
    myActivities.forEach((act) => {
      if (act.category === 'extensao') total += act.computedCredits;
    });
    return Math.min(total, 22);
  });

  const flexivelCredits = computed(() => {
    let total = 0;
    myActivities.forEach((act) => {
      if (act.category === 'flexivel') total += act.computedCredits;
    });
    return Math.min(total, 8);
  });

  const addActivity = () => {
    if (!selectedActivity.value) return;
    const actDef = selectedActivity.value;
    const amt = form.amount;

    if (actDef.minHoras && amt < actDef.minHoras) {
      showModal(`Esta atividade exige um mínimo de ${actDef.minHoras} horas para começar a pontuar.`, {
        title: 'Atenção',
        variant: 'warning',
      });
      return;
    }

    let computedCr = 0;
    if (actDef.tipoCalc === 'horas') {
      computedCr = Math.floor(amt / 15) * actDef.creditosPor15h;
    } else if (actDef.tipoCalc === 'fixo') {
      computedCr = amt * actDef.creditosPorUnidade;
    } else if (actDef.tipoCalc === 'custom') {
      computedCr = amt;
    }

    computedCr = Math.min(computedCr, actDef.maxCreditos);

    myActivities.push({
      id: actDef.id,
      category: actDef.id === 13 ? form.customCategory : actDef.categoria,
      amount: amt,
      computedCredits: computedCr,
    });

    form.activityId = '';
    form.amount = 1;
  };

  const removeActivity = (index) => {
    myActivities.splice(index, 1);
  };

  const getActName = (id) => activities.find((a) => a.id === id)?.desc;

  const getAmountLabel = (id) => {
    const act = activities.find((a) => a.id === id);
    if (!act) return '';
    if (act.tipoCalc === 'horas') return 'horas';
    if (act.tipoCalc === 'fixo') return act.unidadeLabel || 'unidade(s)';
    return 'créditos atribuídos';
  };

  return {
    activities,
    activitiesLoading,
    activitiesOffline,
    myActivities,
    form,
    selectedActivity,
    extensaoCredits,
    flexivelCredits,
    addActivity,
    removeActivity,
    getActName,
    getAmountLabel,
  };
}
