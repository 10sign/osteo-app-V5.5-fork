import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupSafeSnapshot } from '../utils/firestoreListener';

// Mocks
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();

vi.mock('firebase/firestore', () => ({
  getDocs: (...args: any[]) => mockGetDocs(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  Query: class {}
}));

describe('setupSafeSnapshot', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockOnSnapshot.mockReset();
  });

  it('starts listener when initial getDocs succeeds and returns unsubscribe', async () => {
    const fakeSnapshot = { docs: [] };
    mockGetDocs.mockResolvedValue(fakeSnapshot);

    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementation((_q, next) => {
      next(fakeSnapshot);
      return unsubscribe;
    });

    const q: any = {};
    const next = vi.fn();
    const error = vi.fn();

    const cleanup = await setupSafeSnapshot(q, next, error);

    expect(mockGetDocs).toHaveBeenCalledWith(q);
    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(fakeSnapshot);
    expect(error).not.toHaveBeenCalled();

    // call cleanup
    cleanup();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('calls error and does not start listener when getDocs fails', async () => {
    const testError = new Error('permission-denied');
    mockGetDocs.mockRejectedValue(testError);

    const q: any = {};
    const next = vi.fn();
    const error = vi.fn();

    const cleanup = await setupSafeSnapshot(q, next, error);

    expect(mockGetDocs).toHaveBeenCalledWith(q);
    expect(mockOnSnapshot).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(testError);

    // cleanup should be a no-op
    expect(() => cleanup()).not.toThrow();
  });
});