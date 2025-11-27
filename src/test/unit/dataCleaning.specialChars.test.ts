import { describe, it, expect } from 'vitest'
import { cleanDecryptedField } from '../../../src/utils/dataCleaning'
import { encryptData, decryptData } from '../../../src/utils/encryption'

describe('cleanDecryptedField - caractères spéciaux et multi-lignes', () => {
  const textA = `Respi; asthme ; trt Duoresp\nDig; Constipation sans douleur abdo. et Reflux. Trt Inexium .Respi, asthme , trt Duoresp\nDig; Constipation sans douleur abdo. et Reflux. Trt Inexium`
  const textB = `Colo et fibro en juillet 2024.\nPas de trauma ni AVP.\nColo et fibro en juillet 2024.\nPas de trauma ni AVP.`
  const special = 'HHYIYgfzezce176353,;:()%@ _=+*/%¨'

  it('ne vide pas les champs multi-lignes en édition', () => {
    const cleanedA = cleanDecryptedField(textA, true, '')
    const cleanedB = cleanDecryptedField(textB, true, '')
    expect(cleanedA.length).toBeGreaterThan(0)
    expect(cleanedB.length).toBeGreaterThan(0)
    expect(cleanedA).toContain('Respi; asthme ; trt Duoresp')
    expect(cleanedB).toContain('Colo et fibro en juillet 2024.')
  })

  it('conserve ponctuation et accents', () => {
    const cleaned = cleanDecryptedField(special, true, '')
    expect(cleaned).toContain(',;:()%@')
    expect(cleaned).toContain('_=+*/%¨')
  })

  it('round-trip chiffrement/déchiffrement conserve le texte', () => {
    const userId = 'test-user-id'
    const encryptedA = encryptData(textA, userId)
    const decryptedA = decryptData(encryptedA, userId)
    expect(decryptedA).toBe(textA)
    const encryptedB = encryptData(textB, userId)
    const decryptedB = decryptData(encryptedB, userId)
    expect(decryptedB).toBe(textB)
  })
})

