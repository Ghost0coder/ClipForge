import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, ToastMessage } from '../store/toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none"
    >
      {toasts.map((toast: ToastMessage) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-200 transform translate-y-0 opacity-100 ${
              isError
                ? 'bg-[#181014]/95 border-red-500/40 text-red-100 shadow-red-950/40'
                : isSuccess
                ? 'bg-[#0e1a14]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
                : isWarning
                ? 'bg-[#1b170f]/95 border-amber-500/40 text-amber-100 shadow-amber-950/40'
                : 'bg-[#101422]/95 border-cyan-500/40 text-cyan-100 shadow-cyan-950/40'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4
                  className={`text-xs font-bold mb-0.5 ${
                    isError
                      ? 'text-red-300'
                      : isSuccess
                      ? 'text-emerald-300'
                      : isWarning
                      ? 'text-amber-300'
                      : 'text-cyan-300'
                  }`}
                >
                  {toast.title}
                </h4>
              )}
              <p className="text-xs leading-relaxed text-slate-200 break-words">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
