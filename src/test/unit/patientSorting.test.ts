import { describe, it, expect } from 'vitest'
import { compareByCreatedAt, compareByUpdatedAt, compareByUpcomingNextAppointment } from '../../utils/patientSorting'

type P = { id: string; createdAt?: string; updatedAt?: string; nextAppointment?: string }

describe('patientSorting', () => {
  it('sorts by createdAt desc', () => {
    const data: P[] = [
      { id: 'a', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'c' }
    ]
    const sorted = [...data].sort((x, y) => compareByCreatedAt(x, y, 'desc'))
    expect(sorted.map(p => p.id)).toEqual(['b', 'a', 'c'])
  })

  it('sorts by updatedAt asc with fallback to createdAt', () => {
    const data: P[] = [
      { id: 'a', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', updatedAt: '2024-06-01T00:00:00.000Z' },
      { id: 'c', createdAt: '2023-12-31T00:00:00.000Z' }
    ]
    const sorted = [...data].sort((x, y) => compareByUpdatedAt(x, y, 'asc'))
    expect(sorted.map(p => p.id)).toEqual(['c', 'a', 'b'])
  })

  it('sorts upcoming nextAppointment asc and pushes undefined to end', () => {
    const now = new Date('2025-01-01T00:00:00.000Z')
    const data: P[] = [
      { id: 'x', nextAppointment: new Date(now.getTime() + 3 * 86400000).toISOString() },
      { id: 'y', nextAppointment: new Date(now.getTime() + 1 * 86400000).toISOString() },
      { id: 'z' }
    ]
    const sorted = [...data].sort((x, y) => compareByUpcomingNextAppointment(x, y))
    expect(sorted.map(p => p.id)).toEqual(['y', 'x', 'z'])
  })
})