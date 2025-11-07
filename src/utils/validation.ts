import { PatientFormData, ConsultationFormData } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validatePatientData(data: PatientFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields - Ensure these are properly validated
  if (!data.firstName?.trim()) {
    errors.push({ field: 'firstName', message: 'Le prénom est requis' });
  }

  if (!data.lastName?.trim()) {
    errors.push({ field: 'lastName', message: 'Le nom est requis' });
  }

  if (!data.dateOfBirth) {
    errors.push({ field: 'dateOfBirth', message: 'La date de naissance est requise' });
  } else {
    try {
      const birthDate = new Date(data.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        errors.push({ field: 'dateOfBirth', message: 'La date de naissance ne peut pas être dans le futur' });
      }
    } catch (e) {
      errors.push({ field: 'dateOfBirth', message: 'Format de date invalide' });
    }
  }

  // Email validation (optional)
  if (data.email && data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push({ field: 'email', message: 'Adresse email invalide' });
  }

  // Phone number format (optional)
  if (data.phone && data.phone.trim() && !/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(data.phone.trim())) {
    errors.push({ field: 'phone', message: 'Numéro de téléphone invalide' });
  }

  // Validate appointment time if date is set
  if (data.nextAppointment && !data.nextAppointmentTime) {
    errors.push({ field: 'nextAppointmentTime', message: 'L\'heure du rendez-vous est requise' });
  }

  // Validate time format
  if (data.nextAppointmentTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.nextAppointmentTime)) {
    errors.push({ field: 'nextAppointmentTime', message: 'Format d\'heure invalide (HH:mm)' });
  }

  // Validate appointment is not in the past
  if (data.nextAppointment && data.nextAppointmentTime) {
    const appointmentDate = new Date(`${data.nextAppointment}T${data.nextAppointmentTime}`);
    const now = new Date();
    if (appointmentDate < now) {
      errors.push({ field: 'nextAppointmentTime', message: 'Le rendez-vous ne peut pas être dans le passé' });
    }
  }

  // Validation des nouveaux champs
  if (data.treatmentHistory) {
    data.treatmentHistory.forEach((treatment, index) => {
      if (!treatment.date) {
        errors.push({ field: `treatmentHistory[${index}].date`, message: 'La date du traitement est requise' });
      }
      if (!treatment.treatment) {
        errors.push({ field: `treatmentHistory[${index}].treatment`, message: 'La description du traitement est requise' });
      }
    });
  }

  return errors;
}

export function validatePatientUpdate(currentData: PatientFormData, newData: Partial<PatientFormData>): boolean {
  // Check if there are actual changes
  return Object.entries(newData).some(([key, value]) => {
    const currentValue = currentData[key as keyof PatientFormData];
    return value !== currentValue;
  });
}

export function validateAppointmentTime(time: string, date: string): boolean {
  // Validate time format
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return false;
  }

  // Validate appointment is not in the past
  const appointmentDate = new Date(`${date}T${time}`);
  const now = new Date();
  if (appointmentDate < now) {
    return false;
  }

  // Validate time is within working hours (8:00-18:00)
  const [hours] = time.split(':').map(Number);
  return hours >= 8 && hours < 18;
}

// ==========================
// Consultation validations
// ==========================

export function validateConsultationData(data: ConsultationFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required base fields
  if (!data.patientId || typeof data.patientId !== 'string') {
    errors.push({ field: 'patientId', message: 'Le patient est requis' });
  }

  // Date must be provided and valid
  if (!data.date) {
    errors.push({ field: 'date', message: 'La date de consultation est requise' });
  } else {
    const dateVal = data.date instanceof Date ? data.date : new Date(data.date);
    if (isNaN(dateVal.getTime())) {
      errors.push({ field: 'date', message: 'Date de consultation invalide' });
    }
  }

  // Duration and price should be positive numbers
  if (typeof data.duration !== 'number' || data.duration <= 0) {
    errors.push({ field: 'duration', message: 'La durée doit être un nombre positif' });
  }
  if (typeof data.price !== 'number' || data.price < 0) {
    errors.push({ field: 'price', message: 'Le prix doit être un nombre non négatif' });
  }

  // Status must be one of allowed
  const allowedStatus = ['draft', 'completed', 'cancelled'] as const;
  if (!allowedStatus.includes(data.status)) {
    errors.push({ field: 'status', message: 'Statut de consultation invalide' });
  }

  // Clinical fields presence for integrity (allow empty strings but ensure defined)
  const requiredClinicalFields: (keyof ConsultationFormData)[] = [
    'currentTreatment',
    'consultationReason',
    'medicalAntecedents',
    'medicalHistory',
    'osteopathicTreatment',
    'symptoms'
  ];
  for (const field of requiredClinicalFields) {
    if ((data as any)[field] === undefined) {
      errors.push({ field: String(field), message: `Le champ clinique "${String(field)}" doit être défini` });
    }
  }

  // Arrays must be arrays
  if (data.examinations && !Array.isArray(data.examinations)) {
    errors.push({ field: 'examinations', message: 'La liste des examens doit être un tableau' });
  }
  if (data.prescriptions && !Array.isArray(data.prescriptions)) {
    errors.push({ field: 'prescriptions', message: 'La liste des prescriptions doit être un tableau' });
  }
  if (data.symptoms && !Array.isArray(data.symptoms)) {
    errors.push({ field: 'symptoms', message: 'Les symptômes doivent être un tableau' });
  }

  return errors;
}

export function validateConsultationUpdate(data: Partial<ConsultationFormData>): ValidationError[] {
  const errors: ValidationError[] = [];

  // If date provided, must be valid
  if (data.date !== undefined) {
    const dateVal = data.date instanceof Date ? data.date : new Date(data.date as any);
    if (isNaN(dateVal.getTime())) {
      errors.push({ field: 'date', message: 'Date de consultation invalide' });
    }
  }

  // Duration and price must be valid if provided
  if (data.duration !== undefined && (typeof data.duration !== 'number' || data.duration <= 0)) {
    errors.push({ field: 'duration', message: 'La durée doit être un nombre positif' });
  }
  if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
    errors.push({ field: 'price', message: 'Le prix doit être un nombre non négatif' });
  }

  // Status must be valid if provided
  if (data.status !== undefined) {
    const allowedStatus = ['draft', 'completed', 'cancelled'] as const;
    if (!allowedStatus.includes(data.status)) {
      errors.push({ field: 'status', message: 'Statut de consultation invalide' });
    }
  }

  // Array fields validations if provided
  if (data.examinations !== undefined && !Array.isArray(data.examinations)) {
    errors.push({ field: 'examinations', message: 'La liste des examens doit être un tableau' });
  }
  if (data.prescriptions !== undefined && !Array.isArray(data.prescriptions)) {
    errors.push({ field: 'prescriptions', message: 'La liste des prescriptions doit être un tableau' });
  }
  if (data.symptoms !== undefined && !Array.isArray(data.symptoms)) {
    errors.push({ field: 'symptoms', message: 'Les symptômes doivent être un tableau' });
  }

  return errors;
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `${e.field}: ${e.message}`).join('; ');
}