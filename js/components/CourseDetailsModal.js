export const CourseDetailsModal = {
  props: {
    open: { type: Boolean, default: false },
    course: { type: Object, default: null },
    prereqNames: { type: Array, default: () => [] },
    coreqNames: { type: Array, default: () => [] },
  },
  emits: ['close'],
  template: `
    <transition name="modal-fade">
      <div
        v-if="open && course"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        @click.self="$emit('close')"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full border-t-4 border-blue-500 overflow-hidden max-h-[85vh] flex flex-col">
          <div class="p-5 overflow-y-auto">
            <div class="flex justify-between items-start gap-3 mb-3">
              <div>
                <h3 class="font-bold text-gray-800 text-lg leading-tight">{{ course.name }}</h3>
                <p class="text-xs text-gray-500 mt-1">
                  {{ course.id }} · {{ course.tipo }} · {{ course.cr }} cr · CH: {{ course.ch }}
                </p>
              </div>
              <button
                @click="$emit('close')"
                class="shrink-0 text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >&times;</button>
            </div>

            <div class="mb-4">
              <h4 class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Ementa</h4>
              <p v-if="course.ementa" class="text-sm text-gray-700 whitespace-pre-line">{{ course.ementa }}</p>
              <p v-else class="text-sm text-gray-400 italic">Ementa não disponível.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Pré-requisitos</h4>
                <ul v-if="prereqNames.length" class="text-sm text-gray-700 list-disc list-inside space-y-0.5">
                  <li v-for="name in prereqNames" :key="name">{{ name }}</li>
                </ul>
                <p v-else class="text-sm text-gray-400 italic">Nenhum</p>
              </div>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Co-requisitos</h4>
                <ul v-if="coreqNames.length" class="text-sm text-gray-700 list-disc list-inside space-y-0.5">
                  <li v-for="name in coreqNames" :key="name">{{ name }}</li>
                </ul>
                <p v-else class="text-sm text-gray-400 italic">Nenhum</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  `,
};
