import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <i className="bi bi-check-circle-fill text-green-500" style={{ fontSize: '20px' }} />, 
    error: <i className="bi bi-x-circle-fill text-red-500" style={{ fontSize: '20px' }} />,
    warning: <i className="bi bi-exclamation-triangle-fill text-amber-500" style={{ fontSize: '20px' }} />,
    info: <i className="bi bi-info-circle-fill text-blue-500" style={{ fontSize: '20px' }} />,
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${colors[type]} max-w-md`}
    >
      {icons[type]}
      <p className="flex-1 font-medium">{message}</p>
      <button
        onClick={onClose}
        className="hover:opacity-70 transition-opacity"
      >
        <i className="bi bi-x-lg" style={{ fontSize: '18px' }} />
      </button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            duration={toast.duration}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
