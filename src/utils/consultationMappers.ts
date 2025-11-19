import { ConsultationFormData, Consultation } from '../types'

export function buildConsultationCreatePayload(
  form: ConsultationFormData,
  patientSnapshot: Partial<Consultation>,
  appointmentId?: string,
  documents?: any[]
): any {
  const examinations = Array.isArray((form as any).examinations) ? (form as any).examinations : []
  const prescriptions = Array.isArray((form as any).prescriptions) ? (form as any).prescriptions : []
  const symptoms = Array.isArray((form as any).symptoms) ? (form as any).symptoms : []
  const payload: any = {
    patientId: form.patientId,
    patientName: form.patientName,
    date: form.date,
    reason: form.reason,
    treatment: form.treatment,
    notes: form.notes,
    duration: form.duration,
    price: form.price,
    status: form.status,
    examinations,
    prescriptions,
    appointmentId,
    patientFirstName: patientSnapshot.patientFirstName,
    patientLastName: patientSnapshot.patientLastName,
    patientDateOfBirth: patientSnapshot.patientDateOfBirth,
    patientGender: patientSnapshot.patientGender,
    patientPhone: patientSnapshot.patientPhone,
    patientEmail: patientSnapshot.patientEmail,
    patientProfession: patientSnapshot.patientProfession,
    patientAddress: patientSnapshot.patientAddress,
    patientInsurance: patientSnapshot.patientInsurance,
    patientInsuranceNumber: patientSnapshot.patientInsuranceNumber,
    currentTreatment: form.currentTreatment,
    consultationReason: form.consultationReason,
    medicalAntecedents: form.medicalAntecedents,
    medicalHistory: form.medicalHistory,
    osteopathicTreatment: form.osteopathicTreatment,
    symptoms,
    treatmentHistory: form.treatmentHistory,
    documents,
    isInitialConsultation: form.isInitialConsultation
  }
  return payload
}

export function buildConsultationUpdatePayload(
  existing: any,
  form: Partial<ConsultationFormData>,
  documents?: any[]
): any {
  const examinations = Array.isArray((form as any).examinations) ? (form as any).examinations : existing.examinations
  const prescriptions = Array.isArray((form as any).prescriptions) ? (form as any).prescriptions : existing.prescriptions
  const symptoms = Array.isArray((form as any).symptoms) ? (form as any).symptoms : existing.symptoms
  const payload: any = {
    patientId: form.patientId || existing.patientId,
    patientName: form.patientName || existing.patientName,
    notes: form.notes !== undefined ? form.notes : existing.notes,
    duration: form.duration !== undefined ? form.duration : existing.duration,
    price: form.price !== undefined ? form.price : existing.price,
    status: (form as any).status || existing.status,
    examinations,
    prescriptions,
    patientFirstName: (form as any).patientFirstName || existing.patientFirstName,
    patientLastName: (form as any).patientLastName || existing.patientLastName,
    patientDateOfBirth: (form as any).patientDateOfBirth || existing.patientDateOfBirth,
    patientGender: (form as any).patientGender || existing.patientGender,
    patientPhone: (form as any).patientPhone || existing.patientPhone,
    patientEmail: (form as any).patientEmail || existing.patientEmail,
    patientProfession: (form as any).patientProfession || existing.patientProfession,
    patientAddress: (form as any).patientAddress || existing.patientAddress,
    patientInsurance: (form as any).patientInsurance || existing.patientInsurance,
    patientInsuranceNumber: (form as any).patientInsuranceNumber || existing.patientInsuranceNumber,
    currentTreatment: (form as any).currentTreatment !== undefined ? (form as any).currentTreatment : (existing.currentTreatment || ''),
    consultationReason: (form as any).consultationReason !== undefined ? (form as any).consultationReason : (existing.consultationReason || ''),
    medicalAntecedents: (form as any).medicalAntecedents !== undefined ? (form as any).medicalAntecedents : (existing.medicalAntecedents || ''),
    medicalHistory: (form as any).medicalHistory !== undefined ? (form as any).medicalHistory : (existing.medicalHistory || ''),
    osteopathicTreatment: (form as any).osteopathicTreatment !== undefined ? (form as any).osteopathicTreatment : (existing.osteopathicTreatment || ''),
    symptoms,
    treatmentHistory: (form as any).treatmentHistory || existing.treatmentHistory,
    documents
  }
  return payload
}