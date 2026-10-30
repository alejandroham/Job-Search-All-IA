import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration = 3800) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, message, type, title, duration };

    setToasts(prev => [...prev.slice(-3), newToast]); // Keep max 4 visible

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title, 5000), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}

      {/* Floating Apple-style Pill Toasts Container */}
      <div className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none space-y-2 px-4">
        {toasts.map(toast => {
          const icon = {
            success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
            info: <Info className="w-4 h-4 text-blue-500 shrink-0" />
          }[toast.type || 'info'];

          const borderStyle = {
            success: 'border-emerald-500/20 dark:border-emerald-500/30',
            error: 'border-rose-500/20 dark:border-rose-500/30',
            warning: 'border-amber-500/20 dark:border-amber-500/30',
            info: 'border-blue-500/20 dark:border-blue-500/30'
          }[toast.type || 'info'];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto apple-glass border ${borderStyle} px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-3 max-w-md w-full sm:w-auto animate-fade-in transition-all backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90 text-[#1D1D1F] dark:text-[#F5F5F7]`}
              style={{ animation: 'toast-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              {icon}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <p className="text-[11px] font-semibold tracking-tight">{toast.title}</p>
                )}
                <p className="text-xs leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
