import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { ensureInitialConsultationDateImmutability } from '../../utils/consultationRules'

describe('ensureInitialConsultationDateImmutability', () => {
  it('does not throw for non-initial consultation', () => {
    expect(() => ensureInitialConsultationDateImmutability(new Date(), new Date(), false)).not.toThrow()
  })
  it('throws when initial consultation date differs', () => {
    const a = Timestamp.fromDate(new Date('2024-01-01T09:00:00Z'))
    const b = Timestamp.fromDate(new Date('2024-01-02T09:00:00Z'))
    expect(() => ensureInitialConsultationDateImmutability(a, b, true)).toThrow()
  })
  it('does not throw when dates equal', () => {
    const a = Timestamp.fromDate(new Date('2024-01-01T09:00:00Z'))
    const b = Timestamp.fromDate(new Date('2024-01-01T09:00:00Z'))
    expect(() => ensureInitialConsultationDateImmutability(a, b, true)).not.toThrow()
  })
})