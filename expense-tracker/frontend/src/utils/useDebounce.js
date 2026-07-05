import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until `delay` ms after
 * the last change — prevents firing API calls on every keystroke.
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer); // cleanup on each value change
  }, [value, delay]);

  return debouncedValue;
}
