import { useActivities } from '../composables/useActivities.js';

export const HorasTab = {
  setup() {
    return useActivities();
  },
  template: `
    <div class="max-w-4xl mx-auto flex flex-col gap-6">

      <div v-if="activitiesLoading" class="text-sm text-blue-700 bg-blue-50 p-2 rounded flex items-center gap-2">
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Sincronizando critérios de horas complementares...
      </div>
      <div v-else-if="activitiesOffline" class="text-sm text-orange-700 bg-orange-50 p-2 rounded">
        <strong>Aviso:</strong> Não foi possível sincronizar a tabela de critérios. O snapshot offline foi carregado.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white p-6 rounded shadow border-t-4 border-blue-500">
          <h3 class="font-bold text-lg mb-2">Extensão (Mín. 22 Créditos)</h3>
          <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div class="bg-blue-500 h-4 rounded-full transition-all" :style="{ width: Math.min((extensaoCredits / 22) * 100, 100) + '%' }"></div>
          </div>
          <p class="text-sm text-gray-600 font-semibold">{{ extensaoCredits }} / 22 créditos acumulados</p>
          <p class="text-xs text-gray-500 mt-1">Faltam: {{ Math.max(22 - extensaoCredits, 0) }}</p>
        </div>

        <div class="bg-white p-6 rounded shadow border-t-4 border-green-500">
          <h3 class="font-bold text-lg mb-2">Flexíveis (Mín. 8 Créditos)</h3>
          <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div class="bg-green-500 h-4 rounded-full transition-all" :style="{ width: Math.min((flexivelCredits / 8) * 100, 100) + '%' }"></div>
          </div>
          <p class="text-sm text-gray-600 font-semibold">{{ flexivelCredits }} / 8 créditos acumulados</p>
          <p class="text-xs text-gray-500 mt-1">Faltam: {{ Math.max(8 - flexivelCredits, 0) }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded shadow">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Adicionar Atividade</h2>
        <form @submit.prevent="addActivity" class="flex flex-col gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Selecione a Atividade</label>
            <select v-model="form.activityId" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500" required>
              <option disabled value="">-- Escolha uma atividade --</option>
              <option v-for="act in activities" :key="act.id" :value="act.id">
                [{{ act.categoria.toUpperCase() }}] {{ act.desc }}
              </option>
            </select>
          </div>

          <div v-if="selectedActivity" class="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-700">
            <p><strong>Regra:</strong> {{ selectedActivity.doc }}</p>
            <p v-if="selectedActivity.obs" class="mt-1 text-red-600"><strong>Atenção:</strong> {{ selectedActivity.obs }}</p>
          </div>

          <div v-if="selectedActivity" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="selectedActivity.tipoCalc === 'horas'">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Carga Horária (horas)</label>
              <input type="number" v-model.number="form.amount" min="1" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500" required>
            </div>

            <div v-if="selectedActivity.tipoCalc === 'fixo'">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Quantidade de {{ selectedActivity.unidadeLabel }}</label>
              <input type="number" v-model.number="form.amount" min="1" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500" required>
            </div>

            <div v-if="selectedActivity.tipoCalc === 'custom'">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Créditos concedidos pelo colegiado/comitê</label>
              <input type="number" v-model.number="form.amount" min="1" :max="selectedActivity.maxCreditos" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500" required>
            </div>

            <div v-if="selectedActivity.id === 13">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Enquadrar como:</label>
              <select v-model="form.customCategory" class="w-full border border-gray-300 rounded p-2" required>
                <option value="extensao">Extensão</option>
                <option value="flexivel">Complementar Flexível</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end">
            <button type="submit" :disabled="!selectedActivity" class="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
              Registrar Atividade
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atividade</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Registrado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créditos Calculados</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="myActivities.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Nenhuma atividade registrada ainda.</td>
            </tr>
            <tr v-for="(act, index) in myActivities" :key="index">
              <td class="px-6 py-4 text-sm text-gray-800">{{ getActName(act.id) }}</td>
              <td class="px-6 py-4 text-sm text-gray-600 capitalize">
                <span :class="{'text-blue-600 font-semibold': act.category === 'extensao', 'text-green-600 font-semibold': act.category === 'flexivel'}">
                  {{ act.category }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ act.amount }} {{ getAmountLabel(act.id) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-800 font-bold">{{ act.computedCredits }} cr</td>
              <td class="px-6 py-4 text-right text-sm">
                <button @click="removeActivity(index)" class="text-red-500 hover:text-red-700 font-semibold">Remover</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};
