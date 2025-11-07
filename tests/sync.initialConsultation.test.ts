import { describe, test, expect, vi } from 'vitest';

vi.mock('../src/services/bidirectionalSyncService', () => ({
  __esModule: true,
  default: {
    syncPatientFromInitialConsultation: vi.fn(async () => ({ success: true }))
  }
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(async () => ({ exists: () => true, data: () => ({ isInitialConsultation: true, patientId: 'p1' }) })),
  updateDoc: vi.fn(async () => {})
}));

vi.mock('../src/utils/hdsCompliance', () => ({
  __esModule: true,
  default: {
    decryptDataForDisplay: vi.fn(() => ({ isInitialConsultation: true, patientId: 'p1' }))
  },
  HDSCompliance: {
    decryptDataForDisplay: vi.fn(() => ({ isInitialConsultation: true, patientId: 'p1' }))
  }
}));

vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {}
}));

import BidirectionalSyncService from '../src/services/bidirectionalSyncService';
import * as firestore from 'firebase/firestore';
import { ConsultationService } from '../src/services/consultationService';

describe('Initial consultation bidirectional sync', () => {
  test('updateConsultation triggers sync when isInitialConsultation', async () => {
    await ConsultationService.updateConsultation('c1', { clinicalNotes: 'updated' } as any);
    expect(BidirectionalSyncService.syncPatientFromInitialConsultation).toHaveBeenCalled();
    expect(firestore.updateDoc).toHaveBeenCalled();
  });
});