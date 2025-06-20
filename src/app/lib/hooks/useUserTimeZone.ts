'use client'

import { useState, useEffect } from 'react'

interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  timeZone?: string;
}

export const useUserTimeZone = () => {
  const [userTimeZone, setUserTimeZone] = useState<string>('auto');

  useEffect(() => {
    // Client-side only: load time zone from localStorage
    const savedTimeZone = localStorage.getItem('timeZone');
    if (savedTimeZone) {
      setUserTimeZone(savedTimeZone);
    } else {
      // Default to Cairo time if nothing is set initially
      localStorage.setItem('timeZone', 'Africa/Cairo');
      setUserTimeZone('Africa/Cairo');
    }
  }, []);

  const formatDateTime = (date: string | Date, options?: DateTimeFormatOptions) => {
    const d = new Date(date);
    const finalOptions: DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimeZone === 'auto' ? undefined : userTimeZone,
      ...options,
    };
    
    return d.toLocaleString(navigator.language, finalOptions);
  };

  const formatDate = (date: string | Date, options?: DateTimeFormatOptions) => {
    const d = new Date(date);
    const finalOptions: DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: userTimeZone === 'auto' ? undefined : userTimeZone,
      ...options,
    };
    return d.toLocaleDateString(navigator.language, finalOptions);
  };

  const formatTime = (date: string | Date, options?: DateTimeFormatOptions) => {
    const d = new Date(date);
    const finalOptions: DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimeZone === 'auto' ? undefined : userTimeZone,
      ...options,
    };
    return d.toLocaleTimeString(navigator.language, finalOptions);
  };

  return {
    userTimeZone,
    formatDateTime,
    formatDate,
    formatTime,
  };
}; 