import { instructorOf, typeOf } from '../domain/catalog'
import type { Session } from '../domain/types'

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`)

// A one-event .ics file: phones and desktop calendars open it and offer to add the class.
export const toIcs = (s: Session) => {
  const type = typeOf(s.typeId)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ritmo//Classes//EN',
    'BEGIN:VEVENT',
    `UID:${s.id}@ritmo.app`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(s.start)}`,
    `DTEND:${stamp(s.start + s.durationMin * 60000)}`,
    `SUMMARY:${escape(`${type.name} at Ritmo`)}`,
    `LOCATION:${escape(`Ritmo Studio, ${s.room}`)}`,
    `DESCRIPTION:${escape(`With ${instructorOf(s.instructorId).name}. Manage your booking in the Ritmo app.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export const downloadIcs = (s: Session) => {
  const url = URL.createObjectURL(new Blob([toIcs(s)], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `ritmo-${typeOf(s.typeId).id}-${new Date(s.start).toISOString().slice(0, 10)}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
