import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, language } = useAppStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-20 right-4 z-[60] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isTe = language === 'TE';
        const title = isTe ? (toast.titleTe || toast.title) : toast.title;
        const message = isTe ? (toast.messageTe || toast.message) : toast.message;

        const styles = {
          success: {
            wrap: 'bg-white border-emerald-200 shadow-emerald-500/10',
            iconWrap: 'bg-emerald-100 text-emerald-600',
            title: 'text-emerald-950',
            Icon: CheckCircle2,
          },
          error: {
            wrap: 'bg-white border-rose-200 shadow-rose-500/10',
            iconWrap: 'bg-rose-100 text-rose-600',
            title: 'text-rose-950',
            Icon: AlertCircle,
          },
          warning: {
            wrap: 'bg-white border-amber-200 shadow-amber-500/10',
            iconWrap: 'bg-amber-100 text-amber-600',
            title: 'text-amber-950',
            Icon: AlertTriangle,
          },
          info: {
            wrap: 'bg-white border-blue-200 shadow-blue-500/10',
            iconWrap: 'bg-blue-100 text-blue-600',
            title: 'text-blue-950',
            Icon: Info,
          },
        }[toast.type];

        const IconComponent = styles.Icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-right-5 fade-in duration-200 ${styles.wrap}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styles.iconWrap}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black tracking-tight ${styles.title}`}>{title}</p>
              <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5 break-words">
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
