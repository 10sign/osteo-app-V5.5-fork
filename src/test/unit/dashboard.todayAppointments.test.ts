import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardService } from '../../services/dashboardService'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs: vi.fn(async () => ({
    docs: [
      { data: () => ({ date: new Date(), createdAt: new Date(), updatedAt: new Date(), isInitialConsultation: false, isTestData: false }) },
      { data: () => ({ date: new Date(Date.now() - 24*60*60*1000), createdAt: new Date(), updatedAt: new Date(), isInitialConsultation: false, isTestData: false }) },
      { data: () => ({ date: new Date(), isInitialConsultation: true, isTestData: false }) },
    ]
  }))
}))

vi.mock('../../firebase/config', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {}
}))

vi.mock('../../utils/substituteAuth', () => ({
  getEffectiveOsteopathId: vi.fn(async () => 'u1')
}))

vi.mock('../../utils/auditLogger', () => ({
  AuditLogger: { log: vi.fn() },
  AuditEventType: { DATA_ACCESS: 'DATA_ACCESS' },
  SensitivityLevel: { INTERNAL: 'INTERNAL' }
}))

describe('DashboardService.getDashboardStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('counts today consultations by consultation date and excludes initial', async () => {
    const stats = await DashboardService.getDashboardStats()
    expect(stats.todayAppointments).toBe(1)
  })
})