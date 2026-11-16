import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { type LocalDate, toLocalDate } from '@/domain/dates';
import { type AppData, EMPTY_DATA } from '@/domain/types';
import { syncReminders } from '@/services/reminders';

import { type Repository, createRepository } from './repository';

type Status = 'loading' | 'ready' | 'error';

interface StoreValue {
  status: Status;
  data: AppData;
  /** Today's local date in the configured time zone; updates when the day rolls over. */
  today: LocalDate;
  /** Set when the last save failed (the change was rolled back). */
  saveError: string | null;
  loadError: string | null;
  dismissSaveError(): void;
  /**
   * Applies a change immediately, then persists it. If the write fails the
   * state returns to what is actually stored and the promise resolves `false`.
   */
  mutate(change: (data: AppData) => AppData): Promise<boolean>;
  reload(): void;
  /** Discards unreadable saved data and starts empty. */
  resetStorage(): Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  children,
  repository,
  now = () => new Date(),
}: PropsWithChildren<{ repository?: Repository; now?: () => Date }>) {
  const repo = useMemo(() => repository ?? createRepository(), [repository]);
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [instant, setInstant] = useState(now);

  // Latest in-memory state and last state known to be on disk.
  const current = useRef(data);
  const persisted = useRef(data);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const load = useCallback(() => {
    repo.load().then(
      (loaded) => {
        current.current = persisted.current = loaded;
        setData(loaded);
        setStatus('ready');
        syncReminders(loaded).catch(() => {});
      },
      (e: Error) => {
        setLoadError(e.message);
        setStatus('error');
      },
    );
  }, [repo]);

  useEffect(load, [load]);

  const reload = useCallback(() => {
    setStatus('loading');
    load();
  }, [load]);

  // Re-read the clock every 30s and whenever the app returns to the foreground,
  // so "today" moves on at midnight without a restart.
  useEffect(() => {
    const tick = () => setInstant(now());
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && tick());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [now]);

  const mutate = useCallback(
    (change: (data: AppData) => AppData) => {
      const next = change(current.current);
      current.current = next;
      setData(next);
      // Writes run one at a time, in order, so an older save can't land last.
      const result = queue.current.then(async () => {
        try {
          await repo.save(next);
          persisted.current = next;
          setSaveError(null);
          syncReminders(next).catch(() => {});
          return true;
        } catch {
          current.current = persisted.current;
          setData(persisted.current);
          setSaveError('Your last change could not be saved, so it was undone. Check device storage and try again.');
          return false;
        }
      });
      queue.current = result;
      return result;
    },
    [repo],
  );

  const resetStorage = useCallback(async () => {
    await repo.clear();
    reload();
  }, [repo, reload]);

  const today = toLocalDate(instant, data.settings.timeZone);

  const value = useMemo<StoreValue>(
    () => ({
      status,
      data,
      today,
      saveError,
      loadError,
      dismissSaveError: () => setSaveError(null),
      mutate,
      reload,
      resetStorage,
    }),
    [status, data, today, saveError, loadError, mutate, reload, resetStorage],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
