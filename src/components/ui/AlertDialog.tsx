import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';

export type DialogType = 'warning' | 'info' | 'error' | 'success' | 'danger';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: DialogType;
  actionText?: string;
  cancelText?: string;
  onAction?: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'warning',
  actionText = 'Understood',
  cancelText = 'Cancel',
  onAction,
}) => {
  useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const iconConfig = {
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-rose-100',
      iconColor: 'text-rose-600',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
    },
    danger: {
      icon: AlertCircle,
      bgColor: 'bg-rose-100',
      iconColor: 'text-rose-600',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircle2,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
    },
  }[type];

  const IconComponent = iconConfig.icon;

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 text-center relative animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Badge */}
        <div className={`w-14 h-14 rounded-2xl ${iconConfig.bgColor} ${iconConfig.iconColor} flex items-center justify-center mx-auto mb-4 shadow-sm`}>
          <IconComponent className="w-7 h-7" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            {cancelText}
          </button>
          <button
            onClick={handleAction}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black text-white ${iconConfig.btnColor} shadow-md transition-all active:scale-95`}
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
};
