const { reactive } = Vue;

// Single shared modal instance — replaces raw alert() calls across the app
// with a styled, non-blocking dialog. Both tabs' composables import this
// same singleton so only one <MessageModal> needs to be mounted.
const state = reactive({
  open: false,
  title: 'Aviso',
  message: '',
  items: [],
  variant: 'warning',
});

export function useModal() {
  function showModal(message, { title = 'Aviso', items = [], variant = 'warning' } = {}) {
    state.title = title;
    state.message = message;
    state.items = items;
    state.variant = variant;
    state.open = true;
  }

  function closeModal() {
    state.open = false;
  }

  return { modalState: state, showModal, closeModal };
}
