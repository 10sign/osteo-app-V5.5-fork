import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'consultations' })),
  doc: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-consultation-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date }))
  }
}))

vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
}))

vi.mock('../src/utils/hdsCompliance', () => ({
  HDSCompliance: {
    prepareDataForStorage: vi.fn((data: any) => data),
    decryptDataForDisplay: vi.fn((data: any) => data),
  },
}))

import { addDoc } from 'firebase/firestore'
import { ConsultationService } from '../src/services/consultationService'

describe('Enregistrement consultation - champs cliniques et de base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crée une consultation avec tous les champs présents et non undefined', async () => {
    const fullData = {
      patientId: 'patient-1',
      patientName: 'Jean Dupont',
      date: new Date('2024-10-10T10:00:00Z'),
      reason: 'Motif libre',
      treatment: 'Traitement libre',
      notes: 'Note sur le patient',
      duration: 45,
      price: 60,
      status: 'completed' as const,
      examinations: ['Examen A'],
      prescriptions: ['Prescription A'],
      appointmentId: 'appt-1',
      patientFirstName: 'Jean',
      patientLastName: 'Dupont',
      patientDateOfBirth: '1990-01-01',
      patientGender: 'male',
      patientPhone: '0600000000',
      patientProfession: 'Ingénieur',
      patientEmail: 'jean@example.com',
      patientAddress: '1 rue A',
      patientInsurance: 'Mutuelle X',
      patientInsuranceNumber: 'NUM-123',
      currentTreatment: 'Traitement effectué',
      consultationReason: 'Motif détaillé',
      medicalAntecedents: 'Antécédents',
      medicalHistory: 'Historique médical',
      osteopathicTreatment: 'Traitement ostéo',
      symptoms: ['Symptôme A'],
      treatmentHistory: [],
      isInitialConsultation: false,
      documents: [],
    }

    const id = await ConsultationService.createConsultation(fullData as any)
    expect(id).toBe('new-consultation-id')

    const calls = (addDoc as unknown as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBe(1)
    const payload = calls[0][1]

    const requiredKeys = [
      'patientId','patientName','notes','duration','price','status',
      'examinations','prescriptions','patientFirstName','patientLastName',
      'patientDateOfBirth','patientGender','patientPhone','patientEmail',
      'patientProfession','patientAddress','patientInsurance','patientInsuranceNumber',
      'currentTreatment','consultationReason','medicalAntecedents','medicalHistory','osteopathicTreatment','symptoms'
    ]
    for (const k of requiredKeys) {
      expect(payload[k]).not.toBeUndefined()
    }
  })
})