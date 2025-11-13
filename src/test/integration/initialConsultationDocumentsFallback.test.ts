import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase auth
vi.mock('../../firebase/config', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {}
}))

// Mock Firestore getDoc
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(async () => ({
    exists: () => true,
    id: 'c-init',
    data: () => ({
      osteopathId: 'u1',
      patientId: 'p1',
      isInitialConsultation: true,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      documents: []
    })
  }))
}))

const { mockListDocuments } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(async (folder: string) => {
    if (folder.includes('/patients/p1/documents')) {
      return [{
        id: 'doc1',
        name: 'doc1.pdf',
        originalName: 'Ordonnance.pdf',
        url: 'http://localhost/storage/doc1',
        type: 'application/pdf',
        size: 12345,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'u1',
        folder,
        category: 'documents'
      }];
    }
    return []
  })
}))

vi.mock('../../utils/documentStorage', () => ({
  listDocuments: mockListDocuments
}))

import { ConsultationService } from '../../services/consultationService'

describe('Fallback documents for initial consultation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes patient folder documents when initial consultation has no consultation docs', async () => {
    const consultation = await ConsultationService.getConsultationById('c-init')
    expect(consultation).not.toBeNull()
    expect(consultation!.isInitialConsultation).toBe(true)
    expect(consultation!.documents && consultation!.documents.length).toBe(1)
    expect(consultation!.documents![0].displayName).toMatch(/\[Dossier patient\]/)
  })
})