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
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      if (!mountedRef.current) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const { data: result, error: queryError } = await queryFn(controller.signal);
        clearTimeout(timeoutId);

        if (!mountedRef.current) return;
        if (queryError) throw queryError;

        setData(result);
        setError(null);
        setIsLoading(false);
        return;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (!mountedRef.current) return;

        const isRetryable = err.name === 'AbortError' ||
          err.message?.includes('network') ||
          err.message?.includes('fetch');

        if (isRetryable && attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 1000));
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
    mountedRef.current = true;
    if (fetchOnMount) fetch();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
