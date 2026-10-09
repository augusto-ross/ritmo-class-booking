const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const weekdayLongFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export const DAY = 24 * 60 * 60 * 1000

export const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
export const addDays = (ms: number, n: number) => {
  const d = new Date(ms)
  d.setDate(d.getDate() + n)
  return d.getTime()
}
export const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
export const sameDay = (a: number, b: number) => dayKey(a) === dayKey(b)

export const fmtTime = (ms: number) => timeFmt.format(ms)
export const fmtWeekday = (ms: number) => weekdayFmt.format(ms)
export const fmtWeekdayLong = (ms: number) => weekdayLongFmt.format(ms)
export const fmtDate = (ms: number) => dateFmt.format(ms)

export const fmtDay = (ms: number, now: number) => {
  if (sameDay(ms, now)) return 'Today'
  if (sameDay(ms, addDays(now, 1))) return 'Tomorrow'
  if (sameDay(ms, addDays(now, -1))) return 'Yesterday'
  return `${fmtWeekday(ms)}, ${fmtDate(ms)}`
}
export const fmtWhen = (ms: number, now: number) => `${fmtDay(ms, now)} at ${fmtTime(ms)}`

export const fmtAgo = (ms: number, now: number) => {
  const min = Math.max(0, Math.round((now - ms) / 60000))
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (min < 60 * 24) return `${Math.round(min / 60)}h ago`
  return fmtDay(ms, now)
}

export const fmtIn = (ms: number, now: number) => {
  const min = Math.round((ms - now) / 60000)
  if (min <= 0) return 'now'
  if (min < 60) return `in ${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `in ${h}h ${m}m` : `in ${h}h`
}

export const toTimeInput = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
