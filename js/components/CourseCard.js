export const CourseCard = {
  props: {
    course: { type: Object, required: true },
    isDragged: { type: Boolean, default: false },
  },
  emits: ['dragstart', 'dragend', 'cycle-status'],
  template: `
    <div
      draggable="true"
      @dragstart="$emit('dragstart', $event)"
      @dragend="$emit('dragend')"
      class="relative p-3 rounded shadow-sm border transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md"
      :class="{
        'bg-white border-gray-300': course.status === 'Pendente',
        'bg-blue-50 border-blue-300': course.status === 'Planejada',
        'bg-green-50 border-green-300': course.status === 'Concluída',
        'opacity-50 scale-95': isDragged
      }"
    >
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-bold text-sm leading-tight text-gray-800 pr-2">{{ course.name }}</h3>

        <button
          @click.stop="$emit('cycle-status')"
          class="shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded shadow-sm border transition-colors hover:brightness-95 flex items-center gap-1"
          :class="{
            'bg-gray-100 text-gray-600 border-gray-300': course.status === 'Pendente',
            'bg-blue-200 text-blue-800 border-blue-400': course.status === 'Planejada',
            'bg-green-200 text-green-900 border-green-400': course.status === 'Concluída'
          }"
          title="Clique para mudar o status"
        >
          <span v-if="course.status === 'Pendente'">⏳ Pendente</span>
          <span v-else-if="course.status === 'Planejada'">📅 Planejada</span>
          <span v-else>✅ Concluída</span>
        </button>
      </div>

      <div class="text-xs text-gray-500 mb-2">
        <span class="font-semibold text-gray-700">{{ course.id }}</span> | {{ course.tipo }} | {{ course.cr }} cr | CH: {{ course.ch }}
      </div>

      <div v-if="course.trilhas && course.trilhas.length" class="flex flex-wrap gap-1 mb-2">
        <span
          v-for="trilha in course.trilhas"
          :key="trilha"
          class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wide"
        >
          {{ trilha }}
        </span>
      </div>

      <div v-if="course.termsOffered && course.termsOffered.length" class="text-[10px] text-gray-400 mb-2">
        Ofertada em: {{ course.termsOffered.slice(0, 3).join(', ') }}
      </div>

      <div class="flex justify-start items-center mt-2 pt-2 border-t border-gray-200/50">
        <span class="text-xs text-gray-400 pointer-events-none tracking-widest flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          Arrastar
        </span>
      </div>
    </div>
  `,
};
