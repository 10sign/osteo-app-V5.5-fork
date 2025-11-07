import { describe, test, expect } from '@jest/globals';
import { validateConsultationData, validateConsultationUpdate } from '../src/utils/validation';

describe('Consultation validation', () => {
  test('validateConsultationData catches missing required fields', () => {
    const errors = validateConsultationData({} as any);
    const fields = errors.map(e => e.field);
    expect(fields).toEqual(expect.arrayContaining(['patientId','date','duration','price','status']));
  });

  test('validateConsultationData accepts valid payload', () => {
    const errors = validateConsultationData({
      patientId: 'p1',
      date: new Date().toISOString(),
      duration: 30,
      price: 50,
      status: 'completed',
      clinicalNotes: 'OK',
      examinations: [],
      prescriptions: [],
      symptoms: []
    } as any);
    expect(errors.length).toBe(0);
  });

  test('validateConsultationUpdate validates only provided fields', () => {
    const errors = validateConsultationUpdate({ duration: -10 } as any);
    expect(errors.find(e => e.field === 'duration')).toBeTruthy();
  });
});