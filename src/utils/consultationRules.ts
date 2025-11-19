export function ensureInitialConsultationDateImmutability(existingDate: any, newDate: any, isInitial: boolean): void {
  if (!isInitial) return
  if (!existingDate || !newDate) return
  const toMs = (d: any) => {
    if (d && typeof d.toMillis === 'function') return d.toMillis()
    if (d && typeof d.toDate === 'function') return d.toDate().getTime()
    if (d instanceof Date) return d.getTime()
    return Number(d)
  }
  const a = toMs(existingDate)
  const b = toMs(newDate)
  if (a !== b) {
    throw new Error('La date de la consultation initiale est immuable')
  }
}