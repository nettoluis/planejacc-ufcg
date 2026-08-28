const { computed } = Vue;

export const MessageModal = {
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: 'Aviso' },
    message: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    variant: { type: String, default: 'warning' },
  },
  emits: ['close'],
  setup(props) {
    const style = computed(() =>
      props.variant === 'warning'
        ? { icon: '⚠️', accent: 'border-orange-400', iconBg: 'bg-orange-100 text-orange-600' }
        : { icon: 'ℹ️', accent: 'border-blue-400', iconBg: 'bg-blue-100 text-blue-600' }
    );
    return { style };
  },
  template: `
    <transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        @click.self="$emit('close')"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full border-t-4 overflow-hidden" :class="style.accent">
          <div class="p-5">
            <div class="flex items-start gap-3">
              <span
                class="text-xl leading-none rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                :class="style.iconBg"
              >{{ style.icon }}</span>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-800 text-lg mb-1">{{ title }}</h3>
                <p class="text-sm text-gray-600 whitespace-pre-line">{{ message }}</p>
                <ul v-if="items.length" class="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                  <li v-for="(item, i) in items" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-5 py-3 flex justify-end">
            <button
              @click="$emit('close')"
              class="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 text-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </transition>
  `,
};
