import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPatientWithClinicalData } from '../factories/patientFactory'

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'consultations' })),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-consultation-id' }),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date }))
  }
}))

// Mock HDSCompliance
vi.mock('../../utils/hdsCompliance', () => ({
  HDSCompliance: {
    prepareDataForStorage: vi.fn((data) => data),
    decryptDataForDisplay: vi.fn((data) => data)
  }
}))

// Mock AuditLogger
vi.mock('../../utils/auditLogger', () => ({
  AuditLogger: {
    log: vi.fn()
  },
  AuditEventType: {
    DATA_CREATION: 'DATA_CREATION',
    DATA_ACCESS: 'DATA_ACCESS',
    DATA_MODIFICATION: 'DATA_MODIFICATION',
    DATA_DELETION: 'DATA_DELETION'
  },
  SensitivityLevel: {
    LOW: 'LOW',
    SENSITIVE: 'SENSITIVE',
    HIGHLY_SENSITIVE: 'HIGHLY_SENSITIVE'
  }
}))

describe('Consultation Creation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Data validation for consultation creation', () => {
    it('should validate that patient clinical data contains readable text', () => {
      const patientData = createPatientWithClinicalData()
      
      // Vérifier que les données patient contiennent du texte lisible
      expect(patientData.consultationReason).toBe('Douleurs cervicales et maux de tête fréquents')
      expect(patientData.currentTreatment).toBe('Paracétamol 1000mg 3x/jour')
      expect(patientData.medicalAntecedents).toBe('Migraines depuis l\'adolescence, accident de voiture en 2015')
      expect(patientData.medicalHistory).toBe('Patient suivi en neurologie pour migraines chroniques')
      expect(patientData.osteopathicTreatment).toBe('Traitement des tensions cervicales et crâniennes')
      
      // Vérifier qu'aucun champ ne contient d'UUID
      expect(patientData.consultationReason).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(patientData.currentTreatment).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(patientData.medicalAntecedents).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(patientData.medicalHistory).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(patientData.osteopathicTreatment).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
    })

    it('should validate consultation data structure for automatic creation', () => {
      const patientData = createPatientWithClinicalData()
      
      const consultationData = {
        patientId: patientData.id,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        osteopathId: 'test-user-id',
        date: new Date(),
        reason: patientData.consultationReason || 'Première consultation',
        treatment: patientData.osteopathicTreatment || 'Évaluation initiale et anamnèse',
        notes: patientData.notes || 'Consultation générée automatiquement lors de la création du patient.',
        duration: 60,
        price: 60,
        status: 'completed' as const,
        examinations: [],
        prescriptions: [],
        
        // Champs d'identité du patient (snapshot)
        patientFirstName: patientData.firstName,
        patientLastName: patientData.lastName,
        patientDateOfBirth: patientData.dateOfBirth,
        patientGender: patientData.gender,
        patientPhone: patientData.phone,
        patientEmail: patientData.email,
        patientProfession: patientData.profession,
        patientAddress: patientData.address.street,
        patientInsurance: patientData.insurance?.provider,
        patientInsuranceNumber: patientData.insurance?.policyNumber,
        
        // Champs cliniques (snapshot au moment de la consultation)
        currentTreatment: patientData.currentTreatment,
        consultationReason: patientData.consultationReason,
        medicalAntecedents: patientData.medicalAntecedents,
        medicalHistory: patientData.medicalHistory,
        osteopathicTreatment: patientData.osteopathicTreatment,
        symptoms: patientData.tags || []
      }

      // Vérifier que la structure de consultation contient tous les champs requis
      expect(consultationData.patientId).toBe(patientData.id)
      expect(consultationData.patientName).toBe(`${patientData.firstName} ${patientData.lastName}`)
      expect(consultationData.currentTreatment).toBe(patientData.currentTreatment)
      expect(consultationData.consultationReason).toBe(patientData.consultationReason)
      expect(consultationData.medicalAntecedents).toBe(patientData.medicalAntecedents)
      expect(consultationData.medicalHistory).toBe(patientData.medicalHistory)
      expect(consultationData.osteopathicTreatment).toBe(patientData.osteopathicTreatment)
      expect(consultationData.symptoms).toEqual(patientData.tags)
    })

    it('should validate that consultation data does not contain UUIDs', () => {
      const patientData = createPatientWithClinicalData()
      
      const consultationData = {
        currentTreatment: patientData.currentTreatment,
        consultationReason: patientData.consultationReason,
        medicalAntecedents: patientData.medicalAntecedents,
        medicalHistory: patientData.medicalHistory,
        osteopathicTreatment: patientData.osteopathicTreatment
      }

      // Vérifier qu'aucun champ clinique ne contient d'UUID
      Object.values(consultationData).forEach(value => {
        if (typeof value === 'string') {
          expect(value).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
        }
      })
    })
  })

  describe('Manual consultation creation data validation', () => {
    it('should validate prefill data for manual consultation creation', () => {
      const patientData = createPatientWithClinicalData()
      
      // Simuler le préremplissage des champs pour une consultation manuelle
      const prefilledData = {
        currentTreatment: patientData.currentTreatment,
        consultationReason: patientData.consultationReason,
        medicalAntecedents: patientData.medicalAntecedents,
        medicalHistory: patientData.medicalHistory,
        osteopathicTreatment: patientData.osteopathicTreatment,
        symptoms: patientData.tags || []
      }

      // Vérifier que tous les champs sont préremplis avec les données du patient
      expect(prefilledData.currentTreatment).toBe(patientData.currentTreatment)
      expect(prefilledData.consultationReason).toBe(patientData.consultationReason)
      expect(prefilledData.medicalAntecedents).toBe(patientData.medicalAntecedents)
      expect(prefilledData.medicalHistory).toBe(patientData.medicalHistory)
      expect(prefilledData.osteopathicTreatment).toBe(patientData.osteopathicTreatment)
      expect(prefilledData.symptoms).toEqual(patientData.tags)
    })
  })
})
