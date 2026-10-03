import { useState, useRef, useEffect, useCallback } from 'react';
import type { Dish, DishEntry, Draft } from '../types';
import { fetchDishes, patchDish, ApiClientError } from '../api';

const POLL_INTERVAL_MS = 4000;

export function isDirty(entry: DishEntry): boolean {
  return (
    entry.draft.dishName !== entry.saved.dishName ||
    entry.draft.isPublished !== entry.saved.isPublished
  );
}

export function useDishes() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [entries, setEntries] = useState<Record<string, DishEntry>>({});
  const [connection, setConnection] = useState<'online' | 'offline'>('online');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const entriesRef = useRef<Record<string, DishEntry>>({});
  entriesRef.current = entries;

  const mergeServerDishes = useCallback((serverDishes: Dish[]) => {
    setOrder((prevOrder) => {
      const existing = new Set(prevOrder);
      const toAppend: string[] = [];
      for (const d of serverDishes) {
        if (!existing.has(d.dishId)) {
          toAppend.push(d.dishId);
          existing.add(d.dishId);
        }
      }
      return toAppend.length > 0 ? [...prevOrder, ...toAppend] : prevOrder;
    });

    setEntries((prevEntries) => {
      let changed = false;
      const nextEntries = { ...prevEntries };

      for (const serverDish of serverDishes) {
        const entry = prevEntries[serverDish.dishId];
        if (!entry) {
          changed = true;
          nextEntries[serverDish.dishId] = {
            saved: serverDish,
            draft: {
              dishName: serverDish.dishName,
              isPublished: serverDish.isPublished,
            },
            saving: false,
            error: null,
            conflict: null,
            newerAvailable: null,
          };
          continue;
        }

        if (entry.saving) {
          continue;
        }

        if (serverDish.version <= entry.saved.version) {
          if (entry.newerAvailable && entry.newerAvailable.version <= entry.saved.version) {
            changed = true;
            nextEntries[serverDish.dishId] = {
              ...entry,
              newerAvailable: null,
            };
          }
          continue;
        }

        const dirty = isDirty(entry);
        if (!dirty) {
          changed = true;
          nextEntries[serverDish.dishId] = {
            saved: serverDish,
            draft: {
              dishName: serverDish.dishName,
              isPublished: serverDish.isPublished,
            },
            saving: false,
            error: null,
            conflict: null,
            newerAvailable: null,
          };
        } else {
          if (!entry.newerAvailable || serverDish.version > entry.newerAvailable.version) {
            changed = true;
            nextEntries[serverDish.dishId] = {
              ...entry,
              newerAvailable: serverDish,
            };
          }
        }
      }

      return changed ? nextEntries : prevEntries;
    });
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const dishes = await fetchDishes();
      const newEntries: Record<string, DishEntry> = {};
      const newOrder: string[] = [];
      for (const dish of dishes) {
        newOrder.push(dish.dishId);
        newEntries[dish.dishId] = {
          saved: dish,
          draft: {
            dishName: dish.dishName,
            isPublished: dish.isPublished,
          },
          saving: false,
          error: null,
          conflict: null,
          newerAvailable: null,
        };
      }
      setEntries(newEntries);
      setOrder(newOrder);
      setLastUpdated(Date.now());
      setConnection('online');
      setStatus('ready');
    } catch (err: any) {
      setStatus('error');
      setLoadError(err.message || 'Failed to load dishes');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus('loading');
      setLoadError(null);
      try {
        const dishes = await fetchDishes();
        if (cancelled) return;
        const newEntries: Record<string, DishEntry> = {};
        const newOrder: string[] = [];
        for (const dish of dishes) {
          newOrder.push(dish.dishId);
          newEntries[dish.dishId] = {
            saved: dish,
            draft: {
              dishName: dish.dishName,
              isPublished: dish.isPublished,
            },
            saving: false,
            error: null,
            conflict: null,
            newerAvailable: null,
          };
        }
        setEntries(newEntries);
        setOrder(newOrder);
        setLastUpdated(Date.now());
        setConnection('online');
        setStatus('ready');
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setLoadError(err.message || 'Failed to load dishes');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;

    const controller = new AbortController();
    let cancelled = false;
    const inFlight = { current: false };

    async function poll() {
      if (cancelled || inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const serverDishes = await fetchDishes(controller.signal);
        if (cancelled) return;
        setConnection('online');
        setLastUpdated(Date.now());
        mergeServerDishes(serverDishes);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (cancelled) return;
        setConnection('offline');
      } finally {
        inFlight.current = false;
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        poll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      controller.abort();
    };
  }, [status, mergeServerDishes]);

  const edit = useCallback((dishId: string, patch: Partial<Draft>) => {
    const current = entriesRef.current[dishId];
    if (!current || current.saving) return;

    setEntries((prev) => {
      const entry = prev[dishId];
      if (!entry || entry.saving) return prev;
      return {
        ...prev,
        [dishId]: {
          ...entry,
          draft: { ...entry.draft, ...patch },
          error: null,
        },
      };
    });
  }, []);

  const discard = useCallback((dishId: string) => {
    const current = entriesRef.current[dishId];
    if (!current || current.saving) return;

    setEntries((prev) => {
      const entry = prev[dishId];
      if (!entry || entry.saving) return prev;
      return {
        ...prev,
        [dishId]: {
          ...entry,
          draft: {
            dishName: entry.saved.dishName,
            isPublished: entry.saved.isPublished,
          },
          error: null,
        },
      };
    });
  }, []);

  const save = useCallback(async (dishId: string) => {
    const entry = entriesRef.current[dishId];
    if (!entry || entry.saving || !isDirty(entry)) return;

    const savedVersion = entry.saved.version;
    const draftPayload = {
      dishName: entry.draft.dishName,
      isPublished: entry.draft.isPublished,
      expectedVersion: savedVersion,
    };

    setEntries((prev) => {
      const curr = prev[dishId];
      if (!curr) return prev;
      return {
        ...prev,
        [dishId]: {
          ...curr,
          saving: true,
          error: null,
        },
      };
    });

    try {
      const savedDish = await patchDish(dishId, draftPayload);
      setEntries((prev) => {
        const curr = prev[dishId];
        if (!curr) return prev;
        return {
          ...prev,
          [dishId]: {
            ...curr,
            saved: savedDish,
            draft: {
              dishName: savedDish.dishName,
              isPublished: savedDish.isPublished,
            },
            saving: false,
            error: null,
            conflict: null,
            newerAvailable: null,
          },
        };
      });
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        if (err.kind === 'conflict') {
          setEntries((prev) => {
            const curr = prev[dishId];
            if (!curr) return prev;
            return {
              ...prev,
              [dishId]: {
                ...curr,
                saving: false,
                conflict: err.current ?? null,
                error: err.message,
              },
            };
          });
        } else {
          setEntries((prev) => {
            const curr = prev[dishId];
            if (!curr) return prev;
            return {
              ...prev,
              [dishId]: {
                ...curr,
                saving: false,
                error: err.message,
              },
            };
          });
        }
      } else {
        setEntries((prev) => {
          const curr = prev[dishId];
          if (!curr) return prev;
          return {
            ...prev,
            [dishId]: {
              ...curr,
              saving: false,
              error: 'Unexpected error. Please try again.',
            },
          };
        });
      }
    }
  }, []);

  const reloadFromServer = useCallback(async (dishId: string) => {
    const entry = entriesRef.current[dishId];
    if (!entry) return;

    let sourceDish: Dish | null = null;
    if (entry.conflict && entry.newerAvailable) {
      sourceDish =
        entry.conflict.version >= entry.newerAvailable.version
          ? entry.conflict
          : entry.newerAvailable;
    } else if (entry.conflict) {
      sourceDish = entry.conflict;
    } else if (entry.newerAvailable) {
      sourceDish = entry.newerAvailable;
    }

    if (!sourceDish) {
      try {
        const dishes = await fetchDishes();
        const found = dishes.find((d) => d.dishId === dishId);
        if (found) {
          sourceDish = found;
        } else {
          setEntries((prev) => {
            const curr = prev[dishId];
            if (!curr) return prev;
            return {
              ...prev,
              [dishId]: {
                ...curr,
                error: 'Dish not found on server.',
              },
            };
          });
          return;
        }
      } catch (err: any) {
        setEntries((prev) => {
          const curr = prev[dishId];
          if (!curr) return prev;
          return {
            ...prev,
            [dishId]: {
              ...curr,
              error: err.message || 'Failed to reload dish from server.',
            },
          };
        });
        return;
      }
    }

    setEntries((prev) => {
      const curr = prev[dishId];
      if (!curr) return prev;
      return {
        ...prev,
        [dishId]: {
          ...curr,
          saved: sourceDish!,
          draft: {
            dishName: sourceDish!.dishName,
            isPublished: sourceDish!.isPublished,
          },
          error: null,
          conflict: null,
          newerAvailable: null,
        },
      };
    });
  }, []);

  return {
    status,
    loadError,
    order,
    entries,
    connection,
    lastUpdated,
    load,
    edit,
    discard,
    save,
    reloadFromServer,
  };
}
