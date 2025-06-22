"use client";

import { useEffect } from 'react';

export function useRevalidateOnFocus(callback: () => void) {
  useEffect(() => {
    const onFocus = () => {
      callback();
    };

    window.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [callback]);
}