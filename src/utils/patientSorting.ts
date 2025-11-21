export type SortDirection = 'asc' | 'desc'
export type PatientLike = { createdAt?: string; updatedAt?: string; nextAppointment?: string }

const toValidDate = (s?: string) => {
  if (!s) return new Date(0)
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date(0) : d
}

export const compareByCreatedAt = (a: PatientLike, b: PatientLike, direction: SortDirection) => {
  const ad = toValidDate(a.createdAt)
  const bd = toValidDate(b.createdAt)
  return direction === 'desc' ? bd.getTime() - ad.getTime() : ad.getTime() - bd.getTime()
}

export const compareByUpdatedAt = (a: PatientLike, b: PatientLike, direction: SortDirection) => {
  const ad = toValidDate(a.updatedAt || a.createdAt)
  const bd = toValidDate(b.updatedAt || b.createdAt)
  return direction === 'desc' ? bd.getTime() - ad.getTime() : ad.getTime() - bd.getTime()
}

export const compareByUpcomingNextAppointment = (a: PatientLike, b: PatientLike) => {
  if (!a.nextAppointment && !b.nextAppointment) return 0
  if (!a.nextAppointment) return 1
  if (!b.nextAppointment) return -1
  const ad = toValidDate(a.nextAppointment)
  const bd = toValidDate(b.nextAppointment)
  return ad.getTime() - bd.getTime()
}