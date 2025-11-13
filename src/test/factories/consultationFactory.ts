import { Consultation } from '../../types'

export interface ConsultationFactoryOptions {
  id?: string
  patientId?: string
  patientName?: string
  date?: Date
  reason?: string
  treatment?: string
  notes?: string
  consultationReason?: string
  currentTreatment?: string
  medicalAntecedents?: string
  medicalHistory?: string
  osteopathicTreatment?: string
  symptoms?: string[]
  status?: 'draft' | 'completed' | 'cancelled'
  hasEncryptedData?: boolean
}

export function createConsultation(options: ConsultationFactoryOptions = {}): Consultation {
  const now = new Date()
  
  return {
    id: options.id || 'test-consultation-id',
    patientId: options.patientId || 'test-patient-id',
    patientName: options.patientName || 'Jean Dupont',
    osteopathId: 'test-user-id',
    date: options.date || now,
    reason: options.reason || 'Consultation de routine',
    treatment: options.treatment || 'Examen clinique standard',
    notes: options.notes || 'Consultation sans particularité',
    duration: 60,
    price: 60,
    status: options.status || 'completed',
    examinations: [],
    prescriptions: [],
    createdAt: now,
    updatedAt: now,
    
    // Champs d'identité patient (snapshot)
    patientFirstName: 'Jean',
    patientLastName: 'Dupont',
    patientDateOfBirth: '1990-01-01',
    patientGender: 'male',
    patientPhone: '0612345678',
    patientEmail: 'jean.dupont@example.com',
    patientProfession: 'Ingénieur',
    patientAddress: '123 Rue de la Paix',
    patientInsurance: 'Mutuelle Générale',
    patientInsuranceNumber: 'MG123456789',
    
    // Champs cliniques
    currentTreatment: options.currentTreatment || 'Aucun traitement en cours',
    consultationReason: options.consultationReason || 'Douleurs lombaires',
    medicalAntecedents: options.medicalAntecedents || 'Hernie discale L4-L5',
    medicalHistory: options.medicalHistory || 'Antécédents de lombalgies',
    osteopathicTreatment: options.osteopathicTreatment || 'Traitement standard',
    symptoms: options.symptoms || ['Lombalgie', 'Tension']
  }
}

export function createConsultationWithEncryptedData(): Consultation {
  return createConsultation({
    consultationReason: 'fb42d27851489e436817de0b6e682db2:U2FsdGVkX19CrQ2J4s+vXNWLwXiB/uVQEjs//oFFZLn0d86zqrHjLANOTnK67mggB2',
    currentTreatment: 'ff9178f5f13258c2215961b416c6533c:U2FsdGVkX18PUHKdJxPnwS/DXrExg12w4kn+VP9c198=',
    medicalAntecedents: 'c025ce473310bd9f4fd4e3b4fdf5ea05:U2FsdGVkX187R9kKeiM0liAHPxbomJ+5U2bHknwip7oSitTsqrPFxTlaVOZaMkOcX310',
    medicalHistory: '5ab9808ee010c7689e3129446ee9c620:U2FsdGVkX1+KuN2+aJF/n7T3715aNXJmd3fqlJd22/mOnpJUcjBTwFs91bM838jU',
    osteopathicTreatment: 'd8a287bebb3f0fb57f5047f566900f39:U2FsdGVkX1/E4LJ009ZPEcri3PLgM0icRgkkUZ61IPY=',
    notes: '50ed7bc5dd119856fa2614d8fb740276:U2FsdGVkX19gvPlqNAcXN5x69UnxpazjyoWXKkS5wV7vXGUxD+ryebw0klihJ/YbYHM7y5Ml+xNcNzAlAgbQtcHH8eHxJbQawtO28Qkc/V9kop7q3EXk5jG'
  })
}

export function createConsultationWithUserModifications(): Consultation {
  return createConsultation({
    consultationReason: 'Motif modifié par le praticien',
    currentTreatment: 'Traitement personnalisé par le praticien',
    medicalAntecedents: 'Antécédents mis à jour par le praticien',
    medicalHistory: 'Historique modifié par le praticien',
    osteopathicTreatment: 'Traitement ostéopathique personnalisé',
    notes: 'Notes personnalisées du praticien'
  })
}
