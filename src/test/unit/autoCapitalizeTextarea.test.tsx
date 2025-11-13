import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import AutoCapitalizeTextarea from '../../components/ui/AutoCapitalizeTextarea'

describe('AutoCapitalizeTextarea', () => {
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

  it('capitalise la première lettre de chaque ligne lors du change et auto-resize', () => {
    const onChange = vi.fn()
    const { container } = render(
      <AutoCapitalizeTextarea minRows={2} onChange={onChange} />
    )
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()

    // Simule wrapping classes présentes
    expect(textarea.className).toMatch(/whitespace-pre-wrap/)
    expect(textarea.className).toMatch(/break-words/)

    // Définir scrollHeight pour la mesure
    Object.defineProperty(textarea, 'scrollHeight', { value: 50, configurable: true })

    // Saisir du texte multi-lignes en minuscule
    const inputValue = 'bonjour\nsalut'
    fireEvent.change(textarea, { target: { value: inputValue } })

    // La valeur interne doit être immédiatement capitalisée
    expect(textarea.value).toBe('Bonjour\nSalut')

    // Le composant utilise setTimeout(adjustHeight, 0) après le change
    vi.runAllTimers()

    // Et le parent reçoit un onChange avec valeur capitalisée
    expect(onChange).toHaveBeenCalled()
    const lastCallArg = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCallArg.target.value).toBe('Bonjour\nSalut')

    // Hauteur ajustée à 50px (lineHeight fallback 19.2, minHeight 38.4, no max)
    expect(textarea.style.height).toBe('50px')
  })
})