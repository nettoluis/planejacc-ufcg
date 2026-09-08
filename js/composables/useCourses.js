const { reactive, ref, computed, onMounted, watch } = Vue;
import { loadCourses } from '../data/courses.js';
import { normalizeString } from '../util/normalize.js';
import { useModal } from './useModal.js';
import { loadSession, saveSession } from '../data/session-storage.js';

// Electives without a fixed period (the vast majority) live in a
// separate, non-numbered repository column instead of being force-fit
// into a numbered period — it's always rendered last, independent of how
// many real periods currently exist.
const REPO = 'repo';

const isInRepo = (course) => course.customSem === null || course.customSem === undefined;

export function useCourses() {
  const { showModal } = useModal();

  const courses = reactive([]);
  const maxSemesters = ref(9);
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
    const saved = loadSession();
    const { courses: loaded, offline } = await loadCourses();

    if (saved?.maxSemesters) {
      maxSemesters.value = Math.max(9, saved.maxSemesters);
    }

    const overrides = saved?.courseOverrides || {};
    loaded.forEach((c) => {
      const o = overrides[c.id];
      if (o) {
        c.status = o.status;
        c.customSem = o.customSem;
      }
    });

    courses.push(...loaded);
    fetchError.value = offline;
    isLoading.value = false;

    // Autosaves progress (status, semester placement, added periods) to
    // this browser so it survives a reload — no explicit save action.
    watch(
      [courses, maxSemesters],
      () => {
        const courseOverrides = {};
        courses.forEach((c) => {
          courseOverrides[c.id] = { status: c.status, customSem: c.customSem };
        });
        saveSession({ courseOverrides, maxSemesters: maxSemesters.value });
      },
      { deep: true }
    );
  });

  const matchesCommonFilters = (c) => {
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

    return true;
  };

  // The repository is always the last column, after every real period.
  const columns = computed(() => [
    ...Array.from({ length: maxSemesters.value }, (_, i) => i + 1),
    REPO,
  ]);

  const addSemester = () => {
    maxSemesters.value++;
  };

  // True when no course (regardless of the active search/status/trilha
  // filters) is actually placed in this period — as opposed to just
  // appearing empty because a filter is hiding its courses.
  const isSemesterEmpty = (sem) => sem !== REPO && !courses.some((c) => c.customSem === sem);

  // Removes an empty real period, shifting every later period's courses
  // down by one so period numbers stay contiguous. Keeps at least one
  // period around.
  const removeSemester = (sem) => {
    if (!isSemesterEmpty(sem) || maxSemesters.value <= 1) return;

    courses.forEach((c) => {
      if (typeof c.customSem === 'number' && c.customSem > sem) {
        c.customSem -= 1;
      }
    });
    maxSemesters.value--;
  };

  // sem is either a number (a real period) or REPO (the electives
  // repository column).
  const getCoursesBySem = (sem) => {
    return courses.filter((c) => {
      const col = isInRepo(c) ? REPO : c.customSem;
      if (col !== sem) return false;
      if (!matchesCommonFilters(c)) return false;

      // The trilha filter only narrows down the electives repository —
      // once a course is placed in a period (including electives moved
      // out of the repository), it's no longer affected by it.
      if (
        sem === REPO &&
        filterTrilha.value &&
        !(c.trilhas || []).includes(filterTrilha.value)
      ) {
        return false;
      }

      return true;
    });
  };

  const availableTrilhas = computed(() => {
    const set = new Set();
    courses
      .filter((c) => c.tipo === 'Optativa')
      .forEach((c) => (c.trilhas || []).forEach((t) => set.add(t)));
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

  // True once every course currently visible in this column (i.e.
  // respecting the active search/filter) is Concluída — mirrors the
  // Pendente/Concluída toggle on an individual CourseCard, but for the
  // whole column's "Marcar Tudo" button.
  const isSemesterConcluded = (sem) => {
    const visible = getCoursesBySem(sem);
    return visible.length > 0 && visible.every((c) => c.status === 'Concluída');
  };

  // Toggles every course currently visible in this column between
  // Concluída and Pendente in one action.
  const toggleSemesterConcluded = (sem) => {
    const status = isSemesterConcluded(sem) ? 'Pendente' : 'Concluída';
    getCoursesBySem(sem).forEach((c) => {
      c.status = status;
    });
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

    // Dragging a course back into the repository just unschedules it —
    // there's no period to validate ordering against.
    if (targetSem === REPO) return errors;

    if (course.prereqs && course.prereqs.length > 0) {
      for (const reqId of course.prereqs) {
        const req = courses.find((c) => c.id === reqId);
        if (req && !isInRepo(req) && req.customSem >= targetSem) {
          errors.push(
            `Pré-requisito "${req.name}" não atendido (está no ${req.customSem}º período; precisa ser anterior).`
          );
        }
      }
    }

    if (course.coreqs && course.coreqs.length > 0) {
      for (const reqId of course.coreqs) {
        const req = courses.find((c) => c.id === reqId);
        if (req && !isInRepo(req) && req.customSem > targetSem) {
          errors.push(
            `Co-requisito "${req.name}" não atendido (está no ${req.customSem}º período; precisa estar no mesmo ou anterior).`
          );
        }
      }
    }

    // Unscheduled dependents (still sitting in the repository) impose no
    // ordering constraint — only ones already placed in a period do.
    for (const other of courses) {
      if (isInRepo(other)) continue;
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
    const currentCol = isInRepo(course) ? REPO : course.customSem;

    if (currentCol === targetSem) {
      draggedCourse.value = null;
      return;
    }

    const errors = checkMove(course, targetSem);

    if (errors.length > 0) {
      const targetLabel = targetSem === REPO ? 'o repositório de optativas' : `o ${targetSem}º período`;
      showModal(`Não é possível mover "${course.name}" para ${targetLabel}.`, {
        title: 'Movimento inválido',
        items: errors,
        variant: 'warning',
      });
    } else {
      course.customSem = targetSem === REPO ? null : targetSem;
    }

    draggedCourse.value = null;
  };

  return {
    courses,
    columns,
    repoColumn: REPO,
    isLoading,
    fetchError,
    searchQuery,
    filterStatus,
    filterTrilha,
    availableTrilhas,
    getCoursesBySem,
    stats,
    cycleStatus,
    isSemesterConcluded,
    toggleSemesterConcluded,
    addSemester,
    isSemesterEmpty,
    removeSemester,
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
