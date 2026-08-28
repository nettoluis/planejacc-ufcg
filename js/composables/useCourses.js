const { reactive, ref, computed, onMounted } = Vue;
import { loadCourses } from '../data/courses.js';
import { normalizeString } from '../util/normalize.js';
import { useModal } from './useModal.js';

const MAX_CREDITS_PER_SEMESTER = 24;

// The 10th column doubles as the default landing spot for every not-yet
// scheduled elective (see customSem fallback below) and is only a real,
// credit-capped academic term once the user has moved past it by adding
// more periods — matching the same condition the UI uses for its
// "Optativas / Repositório" label.
function isCreditCapped(targetSem, maxSemesters) {
  return !(targetSem === 10 && maxSemesters === 10);
}

export function useCourses() {
  const { showModal } = useModal();

  const courses = reactive([]);
  const maxSemesters = ref(10);
  const isLoading = ref(true);
  const fetchError = ref(false);

  const searchQuery = ref('');
  const filterStatus = ref('geral');
  const filterTrilha = ref('');

  const draggedCourse = ref(null);
  const dragOverSem = ref(null);

  onMounted(async () => {
    const { courses: loaded, offline } = await loadCourses();
    courses.push(...loaded);
    fetchError.value = offline;
    isLoading.value = false;
  });

  const getCoursesBySem = (sem) => {
    return courses.filter((c) => {
      if (c.customSem !== sem) return false;

      if (searchQuery.value) {
        const q = normalizeString(searchQuery.value);
        if (!normalizeString(c.name).includes(q) && !normalizeString(c.id).includes(q)) {
          return false;
        }
      }

      if (filterStatus.value === 'disponiveis' && c.status === 'Pendente') {
        if (c.prereqs && c.prereqs.length > 0) {
          const canTake = c.prereqs.every((reqId) => {
            const req = courses.find((x) => x.id === reqId);
            return req && req.status === 'Concluída';
          });
          if (!canTake) return false;
        }
      }

      if (filterTrilha.value && !(c.trilhas || []).includes(filterTrilha.value)) {
        return false;
      }

      return true;
    });
  };

  const availableTrilhas = computed(() => {
    const set = new Set();
    courses.forEach((c) => (c.trilhas || []).forEach((t) => set.add(t)));
    return [...set].sort();
  });

  const stats = computed(() => {
    let req = 0;
    let opt = 0;
    courses.forEach((c) => {
      if (c.status === 'Concluída') {
        if (c.tipo === 'Obrigatória' || c.tipo === 'Complementar' || c.tipo === 'TCC') req += c.cr;
        if (c.tipo === 'Optativa') opt += c.cr;
      }
    });
    return { obrigatorio: req, optativo: opt };
  });

  const cycleStatus = (course) => {
    const statuses = ['Pendente', 'Planejada', 'Concluída'];
    const idx = statuses.indexOf(course.status);
    course.status = statuses[(idx + 1) % statuses.length];
  };

  // Marks every course currently visible in this semester column (i.e.
  // respecting the active search/filter) as Concluída in one action.
  const markSemesterConcluded = (sem) => {
    getCoursesBySem(sem).forEach((c) => {
      c.status = 'Concluída';
    });
  };

  const addSemester = () => {
    maxSemesters.value++;
  };

  const onDragStart = (event, course) => {
    draggedCourse.value = course;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', course.id);
  };

  const onDragEnd = () => {
    draggedCourse.value = null;
    dragOverSem.value = null;
  };

  const checkMove = (course, targetSem) => {
    const errors = [];

    if (course.prereqs && course.prereqs.length > 0) {
      for (const reqId of course.prereqs) {
        const req = courses.find((c) => c.id === reqId);
        if (req && req.customSem >= targetSem) {
          errors.push(
            `Pré-requisito "${req.name}" não atendido (está no ${req.customSem}º período; precisa ser anterior).`
          );
        }
      }
    }

    if (course.coreqs && course.coreqs.length > 0) {
      for (const reqId of course.coreqs) {
        const req = courses.find((c) => c.id === reqId);
        if (req && req.customSem > targetSem) {
          errors.push(
            `Co-requisito "${req.name}" não atendido (está no ${req.customSem}º período; precisa estar no mesmo ou anterior).`
          );
        }
      }
    }

    for (const other of courses) {
      if (other.prereqs && other.prereqs.includes(course.id) && other.customSem <= targetSem) {
        errors.push(
          `A disciplina "${other.name}" (que está no ${other.customSem}º período) exige que esta seja cursada antes dela.`
        );
      }
      if (other.coreqs && other.coreqs.includes(course.id) && other.customSem < targetSem) {
        errors.push(
          `A disciplina "${other.name}" (que está no ${other.customSem}º período) exige que esta seja cursada junto ou antes dela.`
        );
      }
    }

    if (isCreditCapped(targetSem, maxSemesters.value)) {
      const currentLoad = courses
        .filter((c) => c.customSem === targetSem && c.id !== course.id)
        .reduce((sum, c) => sum + c.cr, 0);
      const projectedLoad = currentLoad + course.cr;

      if (projectedLoad > MAX_CREDITS_PER_SEMESTER) {
        errors.push(
          `Este período ficaria com ${projectedLoad} créditos (máximo de ${MAX_CREDITS_PER_SEMESTER}).`
        );
      }
    }

    return errors;
  };

  const onDrop = (event, targetSem) => {
    dragOverSem.value = null;
    if (!draggedCourse.value) return;

    const course = draggedCourse.value;

    if (course.customSem === targetSem) {
      draggedCourse.value = null;
      return;
    }

    const errors = checkMove(course, targetSem);

    if (errors.length > 0) {
      showModal(`Não é possível mover "${course.name}" para o ${targetSem}º período.`, {
        title: 'Movimento inválido',
        items: errors,
        variant: 'warning',
      });
    } else {
      course.customSem = targetSem;
    }

    draggedCourse.value = null;
  };

  return {
    courses,
    maxSemesters,
    isLoading,
    fetchError,
    searchQuery,
    filterStatus,
    filterTrilha,
    availableTrilhas,
    getCoursesBySem,
    stats,
    cycleStatus,
    markSemesterConcluded,
    addSemester,
    draggedCourse,
    dragOverSem,
    onDragStart,
    onDragEnd,
    onDrop,
  };
}
