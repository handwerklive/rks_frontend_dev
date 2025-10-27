import React, { useState, useEffect, useRef } from 'react';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      const storedItem = item ? JSON.parse(item) : initialValue;

      // If the initial value is an object (but not an array or null), merge it with the stored item.
      // This "heals" the stored data by ensuring all keys from the initial/default object are present.
      if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)) {
          return { ...initialValue, ...storedItem };
      }

      return storedItem;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
  // Debounce timer and last serialized snapshot to minimize JSON work and disk writes
  const writeTimer = useRef<number | null>(null);
  const lastSerializedRef = useRef<string | null>(null);
  const DEBOUNCE_MS = 300;
  
  useEffect(() => {
    // Clear pending write if any and schedule a new one
    if (writeTimer.current !== null) {
      clearTimeout(writeTimer.current);
    }
    writeTimer.current = window.setTimeout(() => {
      try {
        const serialized = JSON.stringify(storedValue);
        if (serialized !== lastSerializedRef.current) {
          window.localStorage.setItem(key, serialized);
          lastSerializedRef.current = serialized;
        }
      } catch (error) {
        console.error(error);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (writeTimer.current !== null) {
        clearTimeout(writeTimer.current);
        writeTimer.current = null;
      }
    };
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}