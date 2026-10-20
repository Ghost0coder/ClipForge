import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto flex items-start gap-2.5 p-3 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] shadow-md transition-all duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={1.5} />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />}
              {!isError && !isSuccess && !isWarning && <Info className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4 className="text-xs font-medium mb-0.5 text-[#171717] dark:text-[#EDEDED]">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs leading-relaxed text-[#737373] dark:text-[#A1A1A1] break-words">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors p-0.5 rounded cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
