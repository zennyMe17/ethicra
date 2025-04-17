import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = { // Add 'export type' here
  id: string;
  message: string;
  duration?: number;
};

type AddToast = (message: string, duration?: number) => void;
type DismissToast = (id: string) => void;

function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([]); // Use the exported type

  const addToast: AddToast = useCallback((message, duration) => {
    const id = uuidv4();
    setToasts((prevToasts) => [...prevToasts, { id, message, duration }]);
  }, []);

  const dismissToast: DismissToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    dismissToast,
  };
}

export { useToast };