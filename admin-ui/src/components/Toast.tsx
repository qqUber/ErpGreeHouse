import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      hideToast(id);
    }, duration);
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`toast toast-${toast.type}`} role="alert">
      <div className="toast-icon">{toastIcons[toast.type]}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

// Hook for simple toast usage without provider
let toastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function setToastFunction(fn: (toast: Omit<Toast, 'id'>) => void) {
  toastFn = fn;
}

export function showToast(type: ToastType, title: string, message?: string) {
  if (toastFn) {
    toastFn({ type, title, message });
  } else {
    // Fallback: console log if no provider
    console.log(`[${type}] ${title}: ${message || ''}`);
  }
}
