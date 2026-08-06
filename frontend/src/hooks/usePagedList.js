import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { describeApiError } from '../api/errors';

/**
 * Reads one page of a list endpoint and keeps the page and the filters in the URL.
 */
const DEFAULT_PAGE_SIZE = 20;

function isAbort(err) {
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
}

function readFilters(searchParams, defaults) {
  const filters = {};

  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = searchParams.get(key);
    if (raw === null) {
      filters[key] = fallback;
    } else {
      filters[key] = typeof fallback === 'boolean' ? raw === 'true' : raw;
    }
  }

  return filters;
}

/** An empty filter means "no filter", and the API rejects a blank value rather than ignoring it. */
function requestParams(filters, page, pageSize) {
  const params = { page, limit: pageSize };

  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) params[key] = value;
  }

  return params;
}

export function usePagedList({
  url,
  itemsKey,
  filterDefaults = {},
  pageSize = DEFAULT_PAGE_SIZE,
  errorFallback = 'Could not load this list',
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const filters = readFilters(searchParams, filterDefaults);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  const goToPage = useCallback(
    (next) => {
      setSearchParams((current) => {
        const updated = new URLSearchParams(current);
        updated.set('page', String(next));
        return updated;
      });
    },
    [setSearchParams]
  );

  const setFilter = useCallback(
    (name, value) => {
      setSearchParams((current) => {
        const updated = new URLSearchParams(current);

        if (value === '' || value === null || value === undefined) {
          updated.delete(name);
        } else {
          updated.set(name, String(value));
        }

        updated.set('page', '1');
        return updated;
      });
    },
    [setSearchParams]
  );

  const filterKey = JSON.stringify(filters);
  const latestRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    async function load() {
      setLoading(true);

      try {
        const res = await api.get(url, {
          params: requestParams(JSON.parse(filterKey), page, pageSize),
          signal: controller.signal,
        });

        /**
         * A response that is no longer the most recent one is dropped. Overlapping requests can finish out of order
         * and letting a slow earlier one land would overwrite the newer results with stale ones.
         */
        if (requestId !== latestRequest.current) return;

        setItems(res.data[itemsKey] ?? []);
        setPagination(res.data.pagination ?? null);
        setMessages([]);
      } catch (err) {
        if (isAbort(err) || requestId !== latestRequest.current) return;
        setMessages(describeApiError(err, errorFallback).messages);
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [url, itemsKey, filterKey, page, pageSize, errorFallback, reloadCount]);

  /**
   * Archiving the last record on a page leaves the user beyond the end of the list. Stepping back to the last page
   * that still exists is what stops that showing up as an empty screen.
   */
  useEffect(() => {
    if (loading || !pagination) return;

    if (page > 1 && page > pagination.pages) {
      goToPage(Math.max(1, pagination.pages));
    }
  }, [loading, pagination, page, goToPage]);

  return { items, pagination, loading, messages, setMessages, filters, setFilter, page, goToPage, reload };
}

export default usePagedList;
