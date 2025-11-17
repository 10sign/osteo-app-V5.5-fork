import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveSpy = vi.fn().mockResolvedValue(undefined)

vi.mock('../src/utils/hdsCompliance', () => ({
  HDSCompliance: {
    saveCompliantData: saveSpy,
    decryptDataForDisplay: vi.fn((data: any) => data),
  },
}))

vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
}))

import { PatientService } from '../src/services/patientService'

describe('Enregistrement patient - vérification des champs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crée un patient et passe tous les champs fournis à la sauvegarde', async () => {
    const patientData = {
      firstName: 'Julie',
      lastName: 'Martin',
      dateOfBirth: '1985-05-12',
      gender: 'female' as const,
      email: 'julie@example.com',
      phone: '0600000000',
      address: { street: '12 rue des Lilas' },
      insurance: { provider: 'Mutuelle Y', policyNumber: 'ABC123' },
      medicalHistory: 'RAS',
      notes: 'Note patient',
      currentTreatment: 'Traitement en cours',
      consultationReason: 'Douleurs',
      medicalAntecedents: 'Antécédents',
      osteopathicTreatment: 'Traitement ostéo',
      documents: [],
      tags: ['Symptôme A'],
      osteopathId: 'will-be-overridden',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      createdBy: 'someone',
    }

    const id = await PatientService.createPatient(patientData as any)
    expect(typeof id).toBe('string')

    const calls = saveSpy.mock.calls
    expect(calls.length).toBe(1)
    const [collection, savedId, savedPayload] = calls[0]
    expect(collection).toBe('patients')
    expect(typeof savedId).toBe('string')

    const expectedKeys = [
      'firstName','lastName','dateOfBirth','gender','email','phone','address','insurance',
      'medicalHistory','notes','currentTreatment','consultationReason','medicalAntecedents','osteopathicTreatment',
      'documents','tags','osteopathId','createdAt','updatedAt','createdBy'
    ]
    for (const k of expectedKeys) {
      expect(savedPayload[k]).not.toBeUndefined()
    }
  })
})