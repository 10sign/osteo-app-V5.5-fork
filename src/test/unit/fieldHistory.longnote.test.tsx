import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldHistory } from '../../components/patient/FieldHistory'

describe('FieldHistory long note rendering', () => {
  it('renders 200000-char note with wrapping classes without crashing', () => {
    const veryLongText = 'A'.repeat(200000)

    render(
      <FieldHistory
        fieldLabel="Notes"
        currentValue={veryLongText}
        history={[{
          value: veryLongText,
          updatedAt: new Date().toISOString(),
          date: new Date(),
          source: 'patient'
        }]}
      />
    )

    const currentValueEl = screen.getByText((content) => content.startsWith('A'))
    expect(currentValueEl).toBeInTheDocument()
    // Ensure wrapping classes applied to current value container
    expect(currentValueEl.className).toMatch(/whitespace-pre-wrap/)
    expect(currentValueEl.className).toMatch(/break-words/)
  })
})