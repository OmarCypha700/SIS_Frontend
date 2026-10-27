"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";

/**
 * Fetch JSON from the API. Re-fetches when `url` or `params` change; pass url=null to skip.
 * Returns { data, error, loading, reload, setData }.
 */
export function useApi(url, params) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) });
  const paramsKey = JSON.stringify(params ?? {});
  const requestId = useRef(0);

  const load = useCallback(
    async (signal) => {
      if (!url) {
        setState({ data: null, error: null, loading: false });
        return;
      }
      const id = ++requestId.current;
      setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const response = await api.get(url, { params: JSON.parse(paramsKey), signal });
        if (id === requestId.current) setState({ data: response.data, error: null, loading: false });
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        if (id === requestId.current) setState((previous) => ({ ...previous, error, loading: false }));
      }
    },
    [url, paramsKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setData = useCallback((updater) => {
    setState((previous) => ({
      ...previous,
      data: typeof updater === "function" ? updater(previous.data) : updater,
    }));
  }, []);

  return { ...state, reload: () => load(), setData };
}

/** Debounce a fast-changing value such as a search box. */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
