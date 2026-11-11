/** The server accepts at most this many ids in one bulk request (common/bulk.py MAX_BULK_IDS). */
export const BULK_BATCH = 500;

/**
 * Sends `ids` in batches of 500, one after another, calling `send(batch)` for each and
 * `onProgress(sentSoFar, total)` after each. Returns the results of the batches sent.
 * If a batch fails after others succeeded, the error carries `results` (what was done) and `remaining` ids.
 */
export async function inBatches(ids, send, onProgress) {
  const results = [];
  for (let start = 0; start < ids.length; start += BULK_BATCH) {
    const batch = ids.slice(start, start + BULK_BATCH);
    try {
      results.push(await send(batch));
    } catch (error) {
      error.results = results;
      error.remaining = ids.slice(start);
      throw error;
    }
    onProgress?.(Math.min(start + BULK_BATCH, ids.length), ids.length);
  }
  return results;
}
