import { jest, describe, test, expect } from '@jest/globals';

jest.mock('../src/services/bidirectionalSyncService', () => ({
  __esModule: true,
  default: {
    syncPatientFromInitialConsultation: jest.fn(async () => ({ success: true }))
  }
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(async () => ({ exists: () => true, data: () => ({ isInitialConsultation: true, patientId: 'p1' }) })),
  updateDoc: jest.fn(async () => {})
}));

jest.mock('../src/utils/hdsCompliance', () => ({
  __esModule: true,
  default: {
    decryptDataForDisplay: jest.fn(() => ({ isInitialConsultation: true, patientId: 'p1' }))
  },
  HDSCompliance: {
    decryptDataForDisplay: jest.fn(() => ({ isInitialConsultation: true, patientId: 'p1' }))
  }
}));

jest.mock('../src/firebase/config', () => ({
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