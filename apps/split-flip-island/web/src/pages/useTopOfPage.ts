import { useEffect } from 'react';

/**
 * Starts a page at the top when it opens. The router keeps the scroll position from the page
 * before, so without this a page reached from a button far down a list opens part way down.
 * Pass the id from the address when one page can lead to another of the same kind (team to team).
 */
export function useTopOfPage(key?: string) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}
