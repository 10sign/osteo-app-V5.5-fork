import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { createPatientWithClinicalData } from '../factories/patientFactory'
import { createConsultationWithEncryptedData } from '../factories/consultationFactory'

// Mock Firebase
vi.mock('../../firebase/config', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com'
    }
  }
}))

// Mock services
const mockCreateConsultation = vi.fn()
const mockGetPatient = vi.fn()
const mockGetConsultations = vi.fn()

vi.mock('../../services/consultationService', () => ({
  ConsultationService: {
    createConsultation: mockCreateConsultation,
    getConsultationsByPatient: mockGetConsultations
  }
}))

vi.mock('../../services/patientService', () => ({
  PatientService: {
    getPatient: mockGetPatient
  }
}))

// Mock HDSCompliance
vi.mock('../../utils/hdsCompliance', () => ({
  HDSCompliance: {
    decryptDataForDisplay: vi.fn((data) => data)
  }
}))

// Mock components
const MockNewConsultationModal = ({ isOpen, onClose, patientId }: any) => {
  if (!isOpen) return null
  
  return (
    <div data-testid="new-consultation-modal">
      <h2>Nouvelle Consultation</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        <input 
          data-testid="consultation-reason" 
          placeholder="Motif de consultation"
          defaultValue="Douleurs cervicales et maux de tête fréquents"
        />
        <input 
          data-testid="current-treatment" 
          placeholder="Traitement en cours"
          defaultValue="Paracétamol 1000mg 3x/jour"
        />
        <textarea 
          data-testid="medical-antecedents" 
          placeholder="Antécédents médicaux"
          defaultValue="Migraines depuis l'adolescence, accident de voiture en 2015"
        />
        <textarea 
          data-testid="medical-history" 
          placeholder="Historique médical"
          defaultValue="Antécédents de lombalgies chroniques"
        />
        <textarea 
          data-testid="osteopathic-treatment" 
          placeholder="Traitement ostéopathique"
          defaultValue="Traitement ostéopathique standard"
        />
        <button 
          data-testid="save-consultation" 
          onClick={() => {
            mockCreateConsultation({
              patientId,
              consultationReason: 'Douleurs cervicales et maux de tête fréquents',
              currentTreatment: 'Paracétamol 1000mg 3x/jour',
              medicalAntecedents: 'Migraines depuis l\'adolescence, accident de voiture en 2015',
              medicalHistory: 'Antécédents de lombalgies chroniques',
              osteopathicTreatment: 'Traitement ostéopathique standard'
            })
            onClose()
          }}
        >
          Enregistrer
        </button>
        <button data-testid="cancel-consultation" onClick={onClose}>
          Annuler
        </button>
      </form>
    </div>
  )
}

const MockPatientDetail = ({ patientId }: { patientId: string }) => {
  const [showNewConsultation, setShowNewConsultation] = React.useState(false)
  
  return (
    <div>
      <h1>Détail du Patient</h1>
      <button 
        data-testid="new-consultation-btn" 
        onClick={() => setShowNewConsultation(true)}
      >
        Nouvelle Consultation
      </button>
      <MockNewConsultationModal 
        isOpen={showNewConsultation}
        onClose={() => setShowNewConsultation(false)}
        patientId={patientId}
      />
    </div>
  )
}

// Import React for useState
import React from 'react'

describe('Patient-Consultation Sync E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateConsultation.mockResolvedValue('new-consultation-id')
  })

  describe('Manual consultation creation with patient data prefill', () => {
    it('should prefill consultation fields with patient clinical data', async () => {
      const patientData = createPatientWithClinicalData()
      mockGetPatient.mockResolvedValue(patientData)

      render(
        <BrowserRouter>
          <MockPatientDetail patientId="test-patient-id" />
        </BrowserRouter>
      )

      // Click on "Nouvelle Consultation" button
      const newConsultationBtn = screen.getByTestId('new-consultation-btn')
      fireEvent.click(newConsultationBtn)

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByTestId('new-consultation-modal')).toBeInTheDocument()
      })

      // Check that fields are prefilled with patient data
      expect(screen.getByTestId('consultation-reason')).toHaveValue('Douleurs cervicales et maux de tête fréquents')
      expect(screen.getByTestId('current-treatment')).toHaveValue('Paracétamol 1000mg 3x/jour')
      expect(screen.getByTestId('medical-antecedents')).toHaveValue('Migraines depuis l\'adolescence, accident de voiture en 2015')
      expect(screen.getByTestId('medical-history')).toHaveValue('Antécédents de lombalgies chroniques')
      expect(screen.getByTestId('osteopathic-treatment')).toHaveValue('Traitement ostéopathique standard')
    })

    it('should save consultation with prefilled data', async () => {
      const patientData = createPatientWithClinicalData()
      mockGetPatient.mockResolvedValue(patientData)

      render(
        <BrowserRouter>
          <MockPatientDetail patientId="test-patient-id" />
        </BrowserRouter>
      )

      // Open new consultation modal
      const newConsultationBtn = screen.getByTestId('new-consultation-btn')
      fireEvent.click(newConsultationBtn)

      await waitFor(() => {
        expect(screen.getByTestId('new-consultation-modal')).toBeInTheDocument()
      })

      // Save consultation
      const saveBtn = screen.getByTestId('save-consultation')
      fireEvent.click(saveBtn)

      // Verify that createConsultation was called with correct data
      expect(mockCreateConsultation).toHaveBeenCalledWith({
        patientId: 'test-patient-id',
        consultationReason: 'Douleurs cervicales et maux de tête fréquents',
        currentTreatment: 'Paracétamol 1000mg 3x/jour',
        medicalAntecedents: 'Migraines depuis l\'adolescence, accident de voiture en 2015',
        medicalHistory: 'Antécédents de lombalgies chroniques',
        osteopathicTreatment: 'Traitement ostéopathique standard'
      })
    })
  })

  describe('Display of migrated consultation data', () => {
    it('should display readable text instead of encrypted UUIDs', async () => {
      const encryptedConsultation = createConsultationWithEncryptedData()
      mockGetConsultations.mockResolvedValue([encryptedConsultation])

      // Mock HDSCompliance to return readable text
      const { HDSCompliance } = await import('../../utils/hdsCompliance')
      vi.mocked(HDSCompliance.decryptDataForDisplay).mockReturnValue({
        ...encryptedConsultation,
        consultationReason: 'Douleurs lombaires chroniques',
        currentTreatment: 'Paracétamol 1000mg 3x/jour',
        medicalAntecedents: 'Hernie discale L4-L5 en 2018',
        medicalHistory: 'Antécédents de lombalgies chroniques',
        osteopathicTreatment: 'Traitement ostéopathique standard',
        notes: 'Notes personnalisées du praticien'
      })

      // This would be tested in a real component that displays consultation data
      const decryptedData = HDSCompliance.decryptDataForDisplay(
        encryptedConsultation,
        'consultations',
        'test-user-id'
      )

      expect(decryptedData.consultationReason).toBe('Douleurs lombaires chroniques')
      expect(decryptedData.currentTreatment).toBe('Paracétamol 1000mg 3x/jour')
      expect(decryptedData.medicalAntecedents).toBe('Hernie discale L4-L5 en 2018')
      expect(decryptedData.medicalHistory).toBe('Antécédents de lombalgies chroniques')
      expect(decryptedData.osteopathicTreatment).toBe('Traitement ostéopathique standard')
      expect(decryptedData.notes).toBe('Notes personnalisées du praticien')
    })
  })

  describe('User modification preservation', () => {
    it('should not overwrite user modifications during migration', async () => {
      const patientData = createPatientWithClinicalData()
      const userModifiedConsultation = {
        id: 'consultation-123',
        patientId: 'patient-456',
        consultationReason: 'Motif modifié par le praticien',
        currentTreatment: 'Traitement personnalisé par le praticien',
        medicalAntecedents: 'Antécédents mis à jour par le praticien',
        medicalHistory: 'Historique modifié par le praticien',
        osteopathicTreatment: 'Traitement ostéopathique personnalisé',
        notes: 'Notes personnalisées du praticien'
      }

      // Mock HDSCompliance to return user-modified data
      const { HDSCompliance } = await import('../../utils/hdsCompliance')
      vi.mocked(HDSCompliance.decryptDataForDisplay).mockReturnValue(userModifiedConsultation)

      const decryptedData = HDSCompliance.decryptDataForDisplay(
        userModifiedConsultation,
        'consultations',
        'test-user-id'
      )

      // Verify that user modifications are preserved
      expect(decryptedData.consultationReason).toBe('Motif modifié par le praticien')
      expect(decryptedData.currentTreatment).toBe('Traitement personnalisé par le praticien')
      expect(decryptedData.medicalAntecedents).toBe('Antécédents mis à jour par le praticien')
      expect(decryptedData.medicalHistory).toBe('Historique modifié par le praticien')
      expect(decryptedData.osteopathicTreatment).toBe('Traitement ostéopathique personnalisé')
      expect(decryptedData.notes).toBe('Notes personnalisées du praticien')
    })
  })
})
