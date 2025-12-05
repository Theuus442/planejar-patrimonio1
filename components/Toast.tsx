import React, { useEffect } from 'react';
import Icon from './Icon';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }[toast.type];

  const icon = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert',
    info: 'info',
  }[toast.type];

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 min-w-max`}>
        <Icon name={icon} className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar notificação"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
