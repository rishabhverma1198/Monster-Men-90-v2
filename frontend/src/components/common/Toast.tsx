/**
 * Toast Notification System
 * Replaces alert() with professional toast notifications
 * Uses Radix UI Toast (already installed)
 */

import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { useState, createContext, useContext, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// Create context for toast management
const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${toastIdRef.current++}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={3000}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-start gap-3 data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut"
            duration={toast.duration}
            onOpenChange={(open) => {
              if (!open) {
                removeToast(toast.id);
              }
            }}
          >
            <div className="flex-1 flex items-start gap-3">
              {toast.type === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              {toast.type === 'error' && (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              {toast.type === 'warning' && (
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              )}
              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm text-gray-900 flex-1">{toast.message}</p>
            </div>
            <ToastPrimitive.Close className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed top-0 right-0 z-[100] flex flex-col p-6 gap-2 w-full max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

// Hook to use toast
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Add animations to index.css
// @keyframes slideIn {
//   from {
//     transform: translateX(100%);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
// @keyframes slideOut {
//   from {
//     transform: translateX(0);
//     opacity: 1;
//   }
//   to {
//     transform: translateX(100%);
//     opacity: 0;
//   }
// }
