import { FluxogramaTab } from './components/FluxogramaTab.js';
import { HorasTab } from './components/HorasTab.js';
import { MessageModal } from './components/MessageModal.js';
import { useModal } from './composables/useModal.js';

const { createApp, ref } = Vue;

const App = {
  components: { FluxogramaTab, HorasTab, MessageModal },
  setup() {
    const tab = ref('fluxograma');
    const { modalState, closeModal } = useModal();
    return { tab, modalState, closeModal };
  },
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="bg-blue-900 text-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="./assets/ufcg_logo.png" alt="Logo UFCG" class="h-10 w-auto">
            <h1 class="text-2xl font-bold">CC UFCG - Meu Currículo</h1>
          </div>
          <nav class="mt-4 md:mt-0 flex gap-2">
            <button
              @click="tab = 'fluxograma'"
              :class="['px-4 py-2 rounded font-semibold transition', tab === 'fluxograma' ? 'bg-white text-blue-900' : 'hover:bg-blue-800']"
            >
              Fluxograma
            </button>
            <button
              @click="tab = 'horas'"
              :class="['px-4 py-2 rounded font-semibold transition', tab === 'horas' ? 'bg-white text-blue-900' : 'hover:bg-blue-800']"
            >
              Horas Complementares
            </button>
          </nav>
        </div>
      </header>

      <main class="flex-1 max-w-full mx-auto p-4 w-full">
        <FluxogramaTab v-if="tab === 'fluxograma'" />
        <HorasTab v-if="tab === 'horas'" />
      </main>

      <MessageModal
        :open="modalState.open"
        :title="modalState.title"
        :message="modalState.message"
        :items="modalState.items"
        :variant="modalState.variant"
        @close="closeModal"
      />
    </div>
  `,
};

createApp(App).mount('#app');
