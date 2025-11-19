import { describe, it, expect } from 'vitest'
import { buildConsultationCreatePayload, buildConsultationUpdatePayload } from '../../utils/consultationMappers'

describe('consultation mappers', () => {
  it('buildConsultationCreatePayload includes clinical and snapshot fields', () => {
    const form: any = {
      patientId: 'p1',
      patientName: 'John Doe',
      date: new Date('2024-01-01T09:00:00Z'),
      reason: 'R',
      treatment: 'T',
      notes: 'N',
      duration: 60,
      price: 60,
      status: 'draft',
      examinations: ['E1'],
      prescriptions: ['P1'],
      currentTreatment: 'CT',
      consultationReason: 'CR',
      medicalAntecedents: 'MA',
      medicalHistory: 'MH',
      osteopathicTreatment: 'OT',
      symptoms: ['S1']
    }
    const snapshot: any = {
      patientFirstName: 'John',
      patientLastName: 'Doe',
      patientDateOfBirth: '1990-01-01',
      patientGender: 'male',
      patientPhone: '123',
      patientEmail: 'john@example.com',
      patientProfession: 'Dev',
      patientAddress: 'Addr',
      patientInsurance: 'Ins',
      patientInsuranceNumber: 'NUM'
    }
    const payload = buildConsultationCreatePayload(form, snapshot, 'a1', [])
    expect(payload.patientId).toBe('p1')
    expect(payload.patientFirstName).toBe('John')
    expect(payload.currentTreatment).toBe('CT')
    expect(payload.consultationReason).toBe('CR')
    expect(payload.medicalHistory).toBe('MH')
    expect(payload.osteopathicTreatment).toBe('OT')
    expect(payload.appointmentId).toBe('a1')
  })

  it('buildConsultationUpdatePayload preserves snapshot and merges clinical', () => {
    const existing: any = { patientId: 'p1', patientName: 'John Doe', currentTreatment: 'CT0' }
    const form: any = { currentTreatment: 'CT1' }
    const result = buildConsultationUpdatePayload(existing, form, [])
    expect(result.patientId).toBe('p1')
    expect(result.currentTreatment).toBe('CT1')
  })
})