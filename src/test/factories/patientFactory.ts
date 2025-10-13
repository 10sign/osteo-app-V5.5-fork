import { Patient } from '../../types'

export interface PatientFactoryOptions {
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  profession?: string
  consultationReason?: string
  currentTreatment?: string
  medicalAntecedents?: string
  medicalHistory?: string
  osteopathicTreatment?: string
  tags?: string[]
  notes?: string
}

export function createPatient(options: PatientFactoryOptions = {}): Patient {
  const now = new Date().toISOString()
  
  return {
    id: options.id || 'test-patient-id',
    firstName: options.firstName || 'Jean',
    lastName: options.lastName || 'Dupont',
    profession: options.profession || 'Ingénieur',
    gender: 'male',
    dateOfBirth: '1990-01-01',
    email: options.email || 'jean.dupont@example.com',
    phone: options.phone || '0612345678',
    address: {
      street: '123 Rue de la Paix',
      city: 'Paris',
      state: 'Île-de-France',
      zipCode: '75001',
      country: 'France'
    },
    insurance: {
      provider: 'Mutuelle Générale',
      policyNumber: 'MG123456789'
    },
    medicalHistory: options.medicalHistory || 'Aucun antécédent médical particulier',
    notes: options.notes || 'Patient coopératif',
    createdAt: now,
    updatedAt: now,
    createdBy: 'test-user-id',
    osteopathId: 'test-user-id',
    tags: options.tags || ['Lombalgie', 'Stress'],
    documentUrl: null,
    isTestData: true,
    
    // Champs cliniques spécifiques
    currentTreatment: options.currentTreatment || 'Aucun traitement en cours',
    consultationReason: options.consultationReason || 'Douleurs lombaires chroniques',
    medicalAntecedents: options.medicalAntecedents || 'Hernie discale L4-L5 en 2018',
    osteopathicTreatment: options.osteopathicTreatment || 'Traitement ostéopathique standard',
    treatmentHistory: []
  }
}

export function createPatientWithClinicalData(): Patient {
  return createPatient({
    consultationReason: 'Douleurs cervicales et maux de tête fréquents',
    currentTreatment: 'Paracétamol 1000mg 3x/jour',
    medicalAntecedents: 'Migraines depuis l\'adolescence, accident de voiture en 2015',
    medicalHistory: 'Patient suivi en neurologie pour migraines chroniques',
    osteopathicTreatment: 'Traitement des tensions cervicales et crâniennes',
    tags: ['Cervicalgie', 'Migraine', 'Tension'],
    notes: 'Patient très sensible aux manipulations cervicales'
  })
}

export function createPatientWithEmptyClinicalData(): Patient {
  return createPatient({
    consultationReason: '',
    currentTreatment: '',
    medicalAntecedents: '',
    medicalHistory: '',
    osteopathicTreatment: '',
    tags: [],
    notes: ''
  })
}
