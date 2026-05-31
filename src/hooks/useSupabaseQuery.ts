import { useState, useEffect, useRef, useCallback } from 'react';

interface QueryOptions {
  timeout?: number;
  fetchOnMount?: boolean;
}

/**
 * Generic hook for Supabase queries with timeout and unmount-safe state updates.
 */
export function useSupabaseQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>,
  deps: any[] = [],
  options: QueryOptions = {}
) {
  const { timeout = 20000, fetchOnMount = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<Error | null>(null);

  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let cancelled = false;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeout)
      );

      const { data: result, error: queryError } = await Promise.race([
        queryFnRef.current(),
        timeoutPromise,
      ]);

      if (cancelled) return;
      if (queryError) throw queryError;

      setData(result);
      setError(null);
      setIsLoading(false);
    } catch (err: any) {
      if (cancelled) return;
      setError(new Error(err.message || 'Failed to load data'));
      setIsLoading(false);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!fetchOnMount) return;

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeout)
        );

        const { data: result, error: queryError } = await Promise.race([
          queryFnRef.current(),
          timeoutPromise,
        ]);

        if (cancelled) return;
        if (queryError) throw queryError;

        setData(result);
        setError(null);
        setIsLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(new Error(err.message || 'Failed to load data'));
        setIsLoading(false);
      }
    };

    run();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
