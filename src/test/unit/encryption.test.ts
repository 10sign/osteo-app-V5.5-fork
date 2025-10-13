import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isEncrypted, decryptData, encryptData } from '../../utils/encryption'

describe('Encryption Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isEncrypted', () => {
    it('should detect UUID-encrypted data format', () => {
      const uuidEncryptedData = 'fb42d27851489e436817de0b6e682db2:U2FsdGVkX19CrQ2J4s+vXNWLwXiB/uVQEjs//oFFZLn0d86zqrHjLANOTnK67mggB2'
      expect(isEncrypted(uuidEncryptedData)).toBe(true)
    })

    it('should detect standard encrypted data format', () => {
      const standardEncryptedData = 'a1b2c3d4e5f6:U2FsdGVkX19CrQ2J4s+vXNWLwXiB/uVQEjs//oFFZLn0d86zqrHjLANOTnK67mggB2'
      expect(isEncrypted(standardEncryptedData)).toBe(true)
    })

    it('should not detect plain text as encrypted', () => {
      const plainText = 'Douleurs lombaires chroniques'
      expect(isEncrypted(plainText)).toBe(false)
    })

    it('should not detect short strings as encrypted', () => {
      const shortString = 'short'
      expect(isEncrypted(shortString)).toBe(false)
    })

    it('should not detect null or undefined as encrypted', () => {
      expect(isEncrypted(null as any)).toBe(false)
      expect(isEncrypted(undefined as any)).toBe(false)
    })
  })

  describe('decryptData', () => {
    it('should handle UUID-encrypted data format', () => {
      const uuidEncryptedData = 'fb42d27851489e436817de0b6e682db2:U2FsdGVkX19CrQ2J4s+vXNWLwXiB/uVQEjs//oFFZLn0d86zqrHjLANOTnK67mggB2'
      const result = decryptData(uuidEncryptedData, 'test-user-id')
      
      // Should attempt to decrypt the part after the UUID
      expect(result).toBeDefined()
    })

    it('should handle empty data gracefully', () => {
      expect(decryptData('', 'test-user-id')).toBe('[NOT_ENCRYPTED_OR_INVALID]')
      expect(decryptData(null as any, 'test-user-id')).toBe('[NOT_ENCRYPTED_OR_INVALID]')
    })

    it('should handle malformed encrypted data', () => {
      const malformedData = 'not-encrypted-data'
      const result = decryptData(malformedData, 'test-user-id')
      expect(result).toBe(malformedData) // Should return as-is for plain text
    })
  })

  describe('encryptData', () => {
    it('should encrypt plain text data', () => {
      const plainText = 'Douleurs lombaires chroniques'
      const encrypted = encryptData(plainText, 'test-user-id')
      
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plainText)
      expect(encrypted).toContain(':') // Should contain IV:encryptedData format
    })

    it('should handle empty data', () => {
      const encrypted = encryptData('', 'test-user-id')
      expect(encrypted).toBeDefined()
    })

    it('should handle object data', () => {
      const objectData = { street: '123 Rue de la Paix', city: 'Paris' }
      const encrypted = encryptData(objectData, 'test-user-id')
      
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(objectData)
    })
  })
})
