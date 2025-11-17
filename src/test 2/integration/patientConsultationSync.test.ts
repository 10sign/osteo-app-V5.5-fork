import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InitialConsultationSyncService } from '../../services/initialConsultationSyncService'
import { HDSCompliance } from '../../utils/hdsCompliance'
import { getDoc, doc } from 'firebase/firestore'

// Basic patient fixture with clinical fields filled
const patientFixture = {
  id: 'p-001',
  firstName: 'Alice',
  lastName: 'Martin',
  dateOfBirth: '1990-05-12',
  gender: 'female',
  phone: '0601020304',
  email: 'alice@example.com',
  profession: 'Infirmière',
  address: { street: '12 Rue des Lilas' },
  insurance: { provider: 'MGEN' },
  insuranceNumber: 'XYZ-123',
  currentTreatment: 'Suivi post-opératoire',
  consultationReason: 'Douleurs lombaires',
  medicalAntecedents: 'Aucun antécédent majeur',
  medicalHistory: 'Anamnèse complète au dossier',
  osteopathicTreatment: 'Manipulations douces',
  tags: ['lombalgie', 'raideur'],
  notes: 'Patient en retour d’activité'
}

describe('InitialConsultationSyncService → Patient ↔ Consultation sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls HDSCompliance.updateCompliantData with patient clinical fields when initial consultation exists', async () => {
    // Mock: the service finds an existing initial consultation
    vi.spyOn(InitialConsultationSyncService as any, 'findInitialConsultation')
      .mockResolvedValue('c-123')

    // Mock Firestore getDoc for backup snapshot
    ;(getDoc as unknown as any).mockResolvedValue({ exists: () => true, data: () => ({}) })
    ;(doc as unknown as any).mockReturnValue({})

    // Mock HDS decrypt for backup
    vi.spyOn(HDSCompliance as any, 'decryptDataForDisplay').mockReturnValue(patientFixture)

    // Spy on the compliant update
    const updateSpy = vi.spyOn(HDSCompliance as any, 'updateCompliantData').mockResolvedValue(undefined)

    const res = await InitialConsultationSyncService.syncInitialConsultationForPatient(
      patientFixture.id,
      patientFixture as any,
      'osteo-001'
    )

    expect(res.success).toBe(true)
    expect(res.consultationId).toBe('c-123')
    expect(updateSpy).toHaveBeenCalledTimes(1)
    const [collection, docId, payload] = updateSpy.mock.calls[0]

    expect(collection).toBe('consultations')
    expect(docId).toBe('c-123')

    // Clinical fields should be present in payload for sync
    expect(payload).toMatchObject({
      currentTreatment: patientFixture.currentTreatment,
      consultationReason: patientFixture.consultationReason,
      medicalAntecedents: patientFixture.medicalAntecedents,
      medicalHistory: patientFixture.medicalHistory,
      osteopathicTreatment: patientFixture.osteopathicTreatment,
      symptoms: patientFixture.tags,
      notes: patientFixture.notes,
      isInitialConsultation: true
    })
  })
})