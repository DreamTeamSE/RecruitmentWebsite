import { useState, useCallback, useEffect } from 'react';

export function useModal<T = unknown>() {
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((value: T) => {
    setData(value);
  }, []);

  const close = useCallback(() => {
    setData(null);
  }, []);

  // Handle scroll lock
  useEffect(() => {
    if (data !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [data]);

  return {
    isOpen: data !== null,
    data,
    open,
    close,
  };
}
