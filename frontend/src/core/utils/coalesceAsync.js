/**
 * Wraps an async loader so concurrent calls share one run.
 * - While a run is in flight, further calls only mark "dirty" and get the same promise.
 * - When the run ends and the flag is dirty, it runs once more (trailing run) so the
 *   last event is never lost and responses can never apply out of order.
 * Arguments of the latest call are used for the trailing run.
 */
export function coalesceAsync(fn) {
  let inflight = null;
  let queued = false;
  let lastArgs = [];
  return (...args) => {
    lastArgs = args;
    if (inflight) { queued = true; return inflight; }
    inflight = (async () => {
      try {
        do {
          queued = false;
          await fn(...lastArgs);
        } while (queued);
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  };
}
