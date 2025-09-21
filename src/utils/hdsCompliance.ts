import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const SENSITIVE_FIELDS: Record<string, string[]> = {
  patients: [
    'firstName', 
    'lastName', 
    'dateOfBirth', 
    'socialSecurityNumber', 
    'email', 
    'phone', 
    'address', 
    'medicalHistory', 
    'allergies'
  ],
  consultations: [
    'reason',
    'consultationReason',
    'symptoms',
    'currentTreatment',
    'ongoingTherapies',
    'medicalHistory',
    'significantHistory',
    'treatment',
    'notes',
    'patientNote'
  ],
  invoices: [
    'patientName',
    'notes'
  ]
};

export { SENSITIVE_FIELDS };