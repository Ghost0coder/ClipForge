import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 4500,
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
export function toastError(message: string, title: string = 'Action Failed'): string {
  console.error(`[ClipForge:Toast] Error: ${title} - ${message}`);
  return useToastStore.getState().addToast({ type: 'error', title, message });
}

export function toastSuccess(message: string, title?: string): string {
  return useToastStore.getState().addToast({ type: 'success', title, message });
}

export function toastWarning(message: string, title?: string): string {
  return useToastStore.getState().addToast({ type: 'warning', title, message });
}

export function toastInfo(message: string, title?: string): string {
  return useToastStore.getState().addToast({ type: 'info', title, message });
}
