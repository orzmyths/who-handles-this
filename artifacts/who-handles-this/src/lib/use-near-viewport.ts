import { useEffect, useState } from 'react';

// Saved history can contain many cards. Translate only cards residents can see,
// rather than flooding the service with requests for the entire history.
export function useNearViewport() {
  const [element, ref] = useState<Element | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!element || visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, visible]);
  return { ref, visible };
}