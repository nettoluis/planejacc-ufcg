const { reactive, ref, computed, onMounted } = Vue;
import { loadCourses } from '../data/courses.js';
import { normalizeString } from '../util/normalize.js';
import { useModal } from './useModal.js';

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
  const hoveredCourseId = ref(null);
  const detailsCourse = ref(null);

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
    course.status = course.status === 'Concluída' ? 'Pendente' : 'Concluída';
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

  // Maps every course related to the hovered one to how it's related, so
  // cards can be highlighted by relation type: courses it requires, its
  // co-requisites, and courses it unlocks once completed.
  const relatedCourseIds = computed(() => {
    const map = new Map();
    const course = courses.find((c) => c.id === hoveredCourseId.value);
    if (!course) return map;

    (course.prereqs || []).forEach((id) => map.set(id, 'prereq'));
    (course.coreqs || []).forEach((id) => map.set(id, 'coreq'));
    courses.forEach((c) => {
      if ((c.prereqs || []).includes(course.id)) map.set(c.id, 'libera');
    });

    return map;
  });

  const setHoveredCourse = (courseId) => {
    hoveredCourseId.value = courseId;
  };

  const openDetails = (course) => {
    detailsCourse.value = course;
  };

  const closeDetails = () => {
    detailsCourse.value = null;
  };

  const resolveCourseNames = (ids) =>
    (ids || []).map((id) => courses.find((c) => c.id === id)?.name || id);

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
    hoveredCourseId,
    relatedCourseIds,
    setHoveredCourse,
    detailsCourse,
    openDetails,
    closeDetails,
    resolveCourseNames,
  };
}
