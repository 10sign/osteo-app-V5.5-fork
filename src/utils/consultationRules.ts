import { Timestamp } from 'firebase/firestore'

export function ensureInitialConsultationDateImmutability(existingDate: Timestamp | Date | undefined, newDate: Timestamp | Date | undefined, isInitial: boolean): void {
  if (!isInitial) return
  if (!existingDate || !newDate) return
  const toMs = (d: Timestamp | Date) => (d instanceof Timestamp ? d.toMillis() : d.getTime())
  const a = toMs(existingDate)
  const b = toMs(newDate)
  if (a !== b) {
    throw new Error('La date de la consultation initiale est immuable')
  }
}