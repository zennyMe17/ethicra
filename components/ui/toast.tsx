import React, { useEffect } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';

  interface ToastProps {
    id: string;
    message: string;
    duration?: number;
    onDismiss: (id: string) => void;
  }

  const Toast = ({ id, message, duration = 3000, onDismiss }: ToastProps) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }, [id, duration, onDismiss]);

    return (
      <motion.div
        className="bg-green-500 text-white p-3 rounded-md shadow-lg mb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {message}
        <button onClick={() => onDismiss(id)} className="ml-2 text-sm font-bold">
          X
        </button>
      </motion.div>
    );
  };

  interface ToastsProps {
    toasts: { id: string; message: string; duration?: number }[];
    onDismiss: (id: string) => void;
  }

  const Toasts = ({ toasts, onDismiss }: ToastsProps) => {
    return (
      <div className="fixed top-5 right-5 z-50 w-80">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  export { Toast, Toasts };