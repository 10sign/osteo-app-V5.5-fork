import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'consultations' })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: false, size: 1, docs: [{ id: 'c-init' }] })),
  doc: vi.fn(() => ({ id: 'c-init' })),
  getDoc: vi.fn(async () => ({ exists: () => true, data: () => ({}) })),
  addDoc: vi.fn(async () => ({ id: 'backup-id' })),
  Timestamp: { fromDate: vi.fn((d: Date) => ({ toDate: () => d })) }
}))

vi.mock('../../firebase/config', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {}
}))

vi.mock('../../utils/hdsCompliance', () => {
  const updateFn = vi.fn(async () => undefined)
  return {
    HDSCompliance: {
      updateCompliantData: updateFn,
      decryptDataForDisplay: vi.fn((d: any) => d),
    }
  }
})

import { InitialConsultationSyncService } from '../../services/initialConsultationSyncService'

describe('Sync consultation initiale - copie des champs vides', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('écrase les champs cliniques avec des chaînes vides et symptoms=[]', async () => {
    const patientId = 'p1'
    const osteopathId = 'ost-1'
    const patientData: any = {
      id: patientId,
      firstName: 'Jean',
      lastName: 'Dupont',
      currentTreatment: '',
      consultationReason: '',
      medicalAntecedents: '',
      medicalHistory: '',
      osteopathicTreatment: '',
      notes: '',
      // tags non défini
    }

    const res = await InitialConsultationSyncService.syncInitialConsultationForPatient(
      patientId,
      patientData,
      osteopathId
    )

    expect(res.success).toBe(true)
    const { HDSCompliance } = await import('../../utils/hdsCompliance')
    const updateMock = HDSCompliance.updateCompliantData as unknown as ReturnType<typeof vi.fn>
    expect(updateMock).toHaveBeenCalledTimes(1)

    const [collection, docId, updates] = updateMock.mock.calls[0]
    expect(collection).toBe('consultations')
    expect(docId).toBe('c-init')

    const requiredStringFields = [
      'currentTreatment',
      'consultationReason',
      'medicalAntecedents',
      'medicalHistory',
      'osteopathicTreatment',
      'notes'
    ]
    for (const k of requiredStringFields) {
      expect(updates[k]).toBe('')
    }

    expect(Array.isArray(updates.symptoms)).toBe(true)
    expect(updates.symptoms.length).toBe(0)

    expect(updates.isInitialConsultation).toBe(true)
    expect(updates.updatedAt).toBeDefined()
  })
})