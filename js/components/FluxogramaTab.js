import { useCourses } from '../composables/useCourses.js';
import { CourseCard } from './CourseCard.js';
import { CourseDetailsModal } from './CourseDetailsModal.js';

export const FluxogramaTab = {
  components: { CourseCard, CourseDetailsModal },
  setup() {
    return useCourses();
  },
  template: `
    <div class="h-full flex flex-col">
      <div v-if="isLoading" class="mb-4 text-sm text-blue-700 bg-blue-50 p-2 rounded flex items-center gap-2">
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Sincronizando disciplinas com as fontes oficiais...
      </div>

      <template v-else-if="fetchError">
        <div class="mb-4 text-sm text-orange-700 bg-orange-50 p-2 rounded">
          <strong>Aviso:</strong> Não foi possível sincronizar com as fontes externas. O currículo do snapshot offline foi carregado.
        </div>
      </template>

      <div class="mb-4 flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded shadow">
        <div class="flex gap-4 items-center">
          <span class="font-semibold text-lg">Legenda:</span>
          <span class="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-600">Pendente</span>
          <span class="px-3 py-1 bg-green-100 border border-green-300 rounded text-sm text-green-800">Concluída</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-sm">
            <strong>Créditos Obrigatórios:</strong> {{ stats.obrigatorio }} / 140
          </div>
          <div class="text-sm">
            <strong>Créditos Optativos:</strong> {{ stats.optativo }} / 44
          </div>
          <button @click="addSemester" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold shadow">
            + Adicionar Período
          </button>
        </div>
      </div>

      <div class="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded shadow">
        <div class="flex-1 w-full relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input type="text" v-model="searchQuery" placeholder="Buscar por nome ou código..." class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-colors">
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
          <label class="font-semibold text-sm text-gray-700 whitespace-nowrap">Filtro:</label>
          <select v-model="filterStatus" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 text-sm font-medium transition-colors">
            <option value="geral">Geral (Todas as Disciplinas)</option>
            <option value="disponiveis">Apenas Disponíveis (Pré-requisitos Concluídos)</option>
          </select>
        </div>

        <div v-if="availableTrilhas.length" class="flex items-center gap-3 w-full md:w-auto">
          <label class="font-semibold text-sm text-gray-700 whitespace-nowrap">Trilha:</label>
          <select v-model="filterTrilha" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 text-sm font-medium transition-colors">
            <option value="">Todas</option>
            <option v-for="trilha in availableTrilhas" :key="trilha" :value="trilha">{{ trilha }}</option>
          </select>
        </div>
      </div>

      <div class="board-container h-full">
        <div
          v-for="sem in maxSemesters"
          :key="sem"
          class="semester-col shadow-sm border-2"
          :class="{'bg-blue-50 border-blue-400 border-dashed': dragOverSem === sem, 'bg-gray-200 border-gray-300 border-solid': dragOverSem !== sem}"
          @dragover.prevent="dragOverSem = sem"
          @dragleave.prevent="dragOverSem = null"
          @drop="onDrop($event, sem)"
        >
          <div class="flex justify-between items-center mb-1 gap-2">
            <h2 class="font-bold text-lg text-gray-700">
              {{ sem === 10 && maxSemesters === 10 ? 'Optativas / Repositório' : sem + 'º Período' }}
            </h2>
            <button
              v-if="getCoursesBySem(sem).length > 0"
              @click="markSemesterConcluded(sem)"
              title="Marcar todas as disciplinas visíveis deste período como concluídas"
              class="shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-green-400 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              ✓ Marcar Tudo
            </button>
          </div>

          <div v-if="getCoursesBySem(sem).length === 0" class="text-sm text-gray-400 italic text-center mt-2">
            Nenhuma disciplina visível
          </div>

          <CourseCard
            v-for="course in getCoursesBySem(sem)"
            :key="course.id"
            :course="course"
            :is-dragged="draggedCourse && draggedCourse.id === course.id"
            :is-hovered="hoveredCourseId === course.id"
            :highlight="relatedCourseIds.get(course.id)"
            @dragstart="onDragStart($event, course)"
            @dragend="onDragEnd"
            @cycle-status="cycleStatus(course)"
            @open-details="openDetails(course)"
            @hover-start="setHoveredCourse(course.id)"
            @hover-end="setHoveredCourse(null)"
          />
        </div>
      </div>

      <CourseDetailsModal
        :open="!!detailsCourse"
        :course="detailsCourse"
        :prereq-names="detailsCourse ? resolveCourseNames(detailsCourse.prereqs) : []"
        :coreq-names="detailsCourse ? resolveCourseNames(detailsCourse.coreqs) : []"
        @close="closeDetails"
      />
    </div>
  `,
};
