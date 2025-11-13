import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPatientWithClinicalData } from '../factories/patientFactory'
import { createConsultationWithEncryptedData, createConsultationWithUserModifications } from '../factories/consultationFactory'

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'consultations' })),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
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

describe('Consultation Migration Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Data validation for migration', () => {
    it('should detect consultations with encrypted UUID data', () => {
      const encryptedConsultation = createConsultationWithEncryptedData()
      
      // Vérifier que la consultation contient des UUIDs chiffrés (format: 32 caractères hexadécimaux)
      expect(encryptedConsultation.consultationReason).toMatch(/^[0-9a-f]{32}:/i)
      expect(encryptedConsultation.currentTreatment).toMatch(/^[0-9a-f]{32}:/i)
      expect(encryptedConsultation.medicalAntecedents).toMatch(/^[0-9a-f]{32}:/i)
      expect(encryptedConsultation.medicalHistory).toMatch(/^[0-9a-f]{32}:/i)
      expect(encryptedConsultation.osteopathicTreatment).toMatch(/^[0-9a-f]{32}:/i)
    })

    it('should detect consultations with valid user-modified data', () => {
      const userModifiedConsultation = createConsultationWithUserModifications()
      
      // Vérifier que la consultation contient du texte lisible (modifications utilisateur)
      expect(userModifiedConsultation.consultationReason).toBe('Motif modifié par le praticien')
      expect(userModifiedConsultation.currentTreatment).toBe('Traitement personnalisé par le praticien')
      expect(userModifiedConsultation.medicalAntecedents).toBe('Antécédents mis à jour par le praticien')
      expect(userModifiedConsultation.medicalHistory).toBe('Historique modifié par le praticien')
      expect(userModifiedConsultation.osteopathicTreatment).toBe('Traitement ostéopathique personnalisé')
      
      // Vérifier qu'aucun champ ne contient d'UUID
      expect(userModifiedConsultation.consultationReason).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(userModifiedConsultation.currentTreatment).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(userModifiedConsultation.medicalAntecedents).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(userModifiedConsultation.medicalHistory).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
      expect(userModifiedConsultation.osteopathicTreatment).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i)
    })

    it('should validate migration logic for encrypted data', () => {
      const patientData = createPatientWithClinicalData()
      const encryptedConsultation = createConsultationWithEncryptedData()
      
      // Simuler la logique de migration
      const hasInvalidData = (field: any) => {
        if (!field || field === '' || field === 'undefined' || field === 'null') return true;
        if (typeof field === 'string') {
          // Détecter les UUIDs simples
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidPattern.test(field)) return true;
          // Détecter les UUIDs chiffrés (format: 32 caractères hexadécimaux)
          const uuidChiffrePattern = /^[0-9a-f]{32}:/i;
          if (uuidChiffrePattern.test(field)) return true;
        }
        return false;
      };

      const shouldReplace = (currentValue: any, patientValue: any) => {
        if (hasInvalidData(currentValue) && patientValue) {
          return patientValue;
        }
        return currentValue || '';
      };

      // Tester la logique de remplacement
      const migratedData = {
        currentTreatment: shouldReplace(encryptedConsultation.currentTreatment, patientData.currentTreatment),
        consultationReason: shouldReplace(encryptedConsultation.consultationReason, patientData.consultationReason),
        medicalAntecedents: shouldReplace(encryptedConsultation.medicalAntecedents, patientData.medicalAntecedents),
        medicalHistory: shouldReplace(encryptedConsultation.medicalHistory, patientData.medicalHistory),
        osteopathicTreatment: shouldReplace(encryptedConsultation.osteopathicTreatment, patientData.osteopathicTreatment)
      };

      // Vérifier que les données migrées contiennent les vraies valeurs du patient
      expect(migratedData.currentTreatment).toBe(patientData.currentTreatment)
      expect(migratedData.consultationReason).toBe(patientData.consultationReason)
      expect(migratedData.medicalAntecedents).toBe(patientData.medicalAntecedents)
      expect(migratedData.medicalHistory).toBe(patientData.medicalHistory)
      expect(migratedData.osteopathicTreatment).toBe(patientData.osteopathicTreatment)
    })

    it('should preserve user modifications during migration', () => {
      const patientData = createPatientWithClinicalData()
      const userModifiedConsultation = createConsultationWithUserModifications()
      
      // Simuler la logique de migration
      const hasInvalidData = (field: any) => {
        if (!field || field === '' || field === 'undefined' || field === 'null') return true;
        if (typeof field === 'string') {
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidPattern.test(field)) return true;
          const uuidChiffrePattern = /^[0-9a-f]{32}:/i;
          if (uuidChiffrePattern.test(field)) return true;
        }
        return false;
      };

      const shouldReplace = (currentValue: any, patientValue: any) => {
        if (hasInvalidData(currentValue) && patientValue) {
          return patientValue;
        }
        return currentValue || '';
      };

      // Tester la logique de remplacement pour les données utilisateur
      const migratedData = {
        currentTreatment: shouldReplace(userModifiedConsultation.currentTreatment, patientData.currentTreatment),
        consultationReason: shouldReplace(userModifiedConsultation.consultationReason, patientData.consultationReason),
        medicalAntecedents: shouldReplace(userModifiedConsultation.medicalAntecedents, patientData.medicalAntecedents),
        medicalHistory: shouldReplace(userModifiedConsultation.medicalHistory, patientData.medicalHistory),
        osteopathicTreatment: shouldReplace(userModifiedConsultation.osteopathicTreatment, patientData.osteopathicTreatment)
      };

      // Vérifier que les modifications utilisateur sont préservées
      expect(migratedData.currentTreatment).toBe('Traitement personnalisé par le praticien')
      expect(migratedData.consultationReason).toBe('Motif modifié par le praticien')
      expect(migratedData.medicalAntecedents).toBe('Antécédents mis à jour par le praticien')
      expect(migratedData.medicalHistory).toBe('Historique modifié par le praticien')
      expect(migratedData.osteopathicTreatment).toBe('Traitement ostéopathique personnalisé')
    })
  })
})
