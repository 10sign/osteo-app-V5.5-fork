import { getDocs, onSnapshot, Query } from 'firebase/firestore';

/**
 * Configure a Firestore onSnapshot listener safely:
 * - Performs an initial getDocs to validate permissions/connectivity.
 * - Starts the real-time listener only if the initial fetch succeeds.
 * - Returns a cleanup function that unsubscribes if started.
 *
 * This reduces noisy aborted network logs by avoiding listeners for queries
 * that would be rejected by rules or fail due to environment constraints.
 */
export async function setupSafeSnapshot(
  q: Query,
  next: (snapshot: any) => void,
  error: (err: Error) => void
): Promise<() => void> {
  try {
    await getDocs(q);
  } catch (err) {
    error(err as Error);
    return () => {};
  }

  const unsubscribe = onSnapshot(q, next, (err) => error(err as Error));
  return () => unsubscribe();
}