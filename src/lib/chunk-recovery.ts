const RELOAD_KEY = 'tokxray:chunk-reload-attempted';

type RecoveryOptions = {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  online: () => boolean;
  reload: () => void;
  showFallback: () => void;
};

/** One automatic reload per tab session, persisted before navigation. Never
 * clear it during startup: that would loop when the new chunk is also missing.
 * If storage is blocked, fail closed to the manual recovery screen. */
export function createChunkRecovery(options: RecoveryOptions) {
  let handled = false;
  return () => {
    if (handled) return;
    handled = true;
    if (options.online()) {
      try {
        if (!options.storage.getItem(RELOAD_KEY)) {
          options.storage.setItem(RELOAD_KEY, '1');
          options.reload();
          return;
        }
      } catch { /* Private browsing/storage policies must not cause a loop. */ }
    }
    options.showFallback();
  };
}

export function installChunkRecovery(target: Pick<Window, 'addEventListener' | 'removeEventListener'>, recover: () => void) {
  const listener = (event: Event) => {
    // Vite otherwise rethrows the import error into React's lazy loader.
    event.preventDefault();
    recover();
  };
  target.addEventListener('vite:preloadError', listener);
  return () => target.removeEventListener('vite:preloadError', listener);
}
