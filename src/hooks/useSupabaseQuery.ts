import { useState, useEffect, useRef, useCallback } from 'react';

interface QueryOptions {
  timeout?: number;
  maxRetries?: number;
  fetchOnMount?: boolean;
}

/**
 * Generic hook for Supabase queries with timeout, retry, and abort support.
 */
export function useSupabaseQuery<T>(
  queryFn: (signal: AbortSignal) => PromiseLike<{ data: T | null; error: any }>,
  deps: any[] = [],
  options: QueryOptions = {}
) {
  const { timeout = 12000, maxRetries = 2, fetchOnMount = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<Error | null>(null);

  // Store queryFn in a ref so useCallback always has the latest version
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  // Track the current active abort controller to cancel on unmount/re-fetch
  const activeControllerRef = useRef<AbortController | null>(null);
  // Incremented on each fetch call to ignore stale responses
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    const currentFetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      // Check if this fetch is still the latest one
      if (currentFetchId !== fetchIdRef.current) return;

      const controller = new AbortController();
      activeControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const { data: result, error: queryError } = await queryFnRef.current(controller.signal);
        clearTimeout(timeoutId);

        // Stale check - a newer fetch may have started
        if (currentFetchId !== fetchIdRef.current) return;
        if (queryError) throw queryError;

        setData(result);
        setError(null);
        setIsLoading(false);
        return;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (currentFetchId !== fetchIdRef.current) return;

        // If aborted due to unmount/re-fetch (stale), exit silently
        // If aborted due to our own timeout, fall through to show error
        if (err.name === 'AbortError' && currentFetchId !== fetchIdRef.current) return;

        const isRetryable =
          err.message?.includes('network') ||
          err.message?.includes('fetch');

        if (isRetryable && attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          // Check again after delay
          if (currentFetchId !== fetchIdRef.current) return;
          continue;
        }

        const errorMessage = err.name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : err.message || 'Failed to load data';

        setError(new Error(errorMessage));
        setIsLoading(false);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (fetchOnMount) fetchData();

    return () => {
      // Cancel in-flight request on unmount
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      // Invalidate any pending fetch
      fetchIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
