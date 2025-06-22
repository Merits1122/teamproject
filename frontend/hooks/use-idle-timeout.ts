"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

export function useIdleTimeout(onIdle: () => void, idleTimeout = 600000) {
  const { toast } = useToast();

  const [isIdle, setIsIdle] = useState(false);

  const handleIdle = useCallback(() => {
    const toastRef = toast({
      title: "세션 만료 예정",
      description: "활동이 없어 1분 후 자동으로 로그아웃됩니다. 화면을 클릭하거나 키를 눌러주세요.",
      duration: 60000,
    });

    const finalTimeout = setTimeout(() => {
        onIdle();
    }, 60000); 

    const handleActivity = () => {
        toastRef.dismiss();
        clearTimeout(finalTimeout);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
    };
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

  }, [onIdle, toast]);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleIdle, idleTimeout);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [idleTimeout, handleIdle]);

  return isIdle;
}