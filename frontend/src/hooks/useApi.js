import { useState, useCallback } from "react";

/**
 * Generic data-fetching hook.
 *
 * Encapsulates the loading / error / data state pattern that was
 * duplicated across every page component. Pages declare WHAT to fetch,
 * not HOW to manage async state.
 *
 * @param {Function} apiFn   - The async function to call (must return { data })
 * @param {*}        initial - Initial value for `data` before first fetch
 *
 * @example
 *   const { data, loading, error, execute } = useApi(getAIAnalysis, null);
 *   useEffect(() => { execute(); }, [execute]);
 */
const useApi = (apiFn, initial = null) => {
  const [data,    setData]    = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFn(...args);
      // Support both { data: { data: ... } } (ApiResponse envelope) and raw { data: ... }
      const payload = response?.data?.data ?? response?.data ?? response;
      setData(payload);
      return payload;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "An unexpected error occurred.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  const reset = useCallback(() => {
    setData(initial);
    setError(null);
    setLoading(false);
  }, [initial]);

  return { data, loading, error, execute, reset };
};

export default useApi;
