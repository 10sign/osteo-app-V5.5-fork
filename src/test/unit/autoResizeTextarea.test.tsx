import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import AutoResizeTextarea from '../../components/ui/AutoResizeTextarea'

describe('AutoResizeTextarea', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
      fontSize: '16px',
      lineHeight: 'normal'
    }) as unknown as CSSStyleDeclaration)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  it('applique les classes de wrapping et calcule la hauteur initiale', () => {
    const { container } = render(<AutoResizeTextarea minRows={3} />)
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()

    // Vérifie les classes utilitaires
    expect(textarea.className).toMatch(/whitespace-pre-wrap/)
    expect(textarea.className).toMatch(/break-words/)

    // Simule une scrollHeight et déclenche la mesure via le setTimeout du mount
    Object.defineProperty(textarea, 'scrollHeight', { value: 300, configurable: true })
    vi.runAllTimers()

    // lineHeight fallback: 16 * 1.2 = 19.2, minHeight = 57.6, maxRows non défini
    // newHeight = max(300, 57.6) = 300
    expect(textarea.style.height).toBe('300px')
  })

  it('respecte minRows et maxRows pour limiter la hauteur', () => {
    const { container } = render(<AutoResizeTextarea minRows={3} maxRows={5} />)
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()

    // scrollHeight très grand pour forcer le plafond
    Object.defineProperty(textarea, 'scrollHeight', { value: 1000, configurable: true })

    // Déclenche la mesure au mount
    vi.runAllTimers()

    // lineHeight = 19.2, minHeight = 57.6, maxHeight = 96
    expect(textarea.style.height).toBe('96px')

    // Réduit le contenu pour tester min/max dynamique via input
    Object.defineProperty(textarea, 'scrollHeight', { value: 60, configurable: true })
    fireEvent.input(textarea, { target: { value: 'abc' } })

    // newHeight = min(max(60, 57.6), 96) = 60
    expect(textarea.style.height).toBe('60px')
  })
})