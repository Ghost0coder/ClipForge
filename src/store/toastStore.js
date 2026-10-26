 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { create } from 'zustand';

 
















export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const newToast = {
      ...toast,
      id,
      duration: _nullishCoalesce(toast.duration, () => ( 4500)),
    };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, newToast.duration);
    }
    return id;
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  clearAll: () => set({ toasts: [] }),
}));

// Global convenience helpers
export function toastError(message, title = 'Action Failed') {
  console.error(`[ClipForge:Toast] Error: ${title} - ${message}`);
  return useToastStore.getState().addToast({ type: 'error', title, message });
}

export function toastSuccess(message, title, action) {
  return useToastStore.getState().addToast({ type: 'success', title, message, action });
}

export function toastWarning(message, title) {
  return useToastStore.getState().addToast({ type: 'warning', title, message });
}

export function toastInfo(message, title) {
  return useToastStore.getState().addToast({ type: 'info', title, message });
}

export const ToastMessage = Object.freeze({});
