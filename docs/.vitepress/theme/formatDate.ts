export function formatDate(date: unknown): string {
  if (!date) return ''
  return new Date(date as string).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
