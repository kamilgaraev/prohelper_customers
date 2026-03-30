import { useEffect, useState } from 'react';

export function useAsyncValue<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [value, setValue] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loader();

        if (!cancelled) {
          setValue(result);
        }
      } catch (loaderError) {
        if (!cancelled) {
          setError(loaderError instanceof Error ? loaderError.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { value, isLoading, error };
}

