import { LEO, MAYA, MEMBERS, SAM, typeOf } from './catalog'
import { DEFAULT_RULES, hasStarted, scheduleClashes, seriesKey } from './rules'
import { addDays, DAY, fmtWhen, startOfDay } from '../lib/format'
import type { ID, Notice, Session, Studio } from './types'

type Slot = [time: string, typeId: ID, instructorId: ID, room: string, capacity: number, durationMin: number]

const WEEKDAY: Slot[] = [
  ['07:00', 'spin', 'ana', 'Cycle Room', 14, 45],
  ['08:15', 'pilates', 'bea', 'Studio A', 10, 50],
  ['12:15', 'hiit', 'tom', 'Studio B', 16, 40],
  ['18:00', 'muay', 'kai', 'Dojo', 14, 60],
  ['19:30', 'spin', 'rafa', 'Cycle Room', 14, 45],
]
// Studio A and Studio B are shared between pilates, yoga and HIIT.
const EVENING_A: Slot[] = [['18:30', 'pilates', 'bea', 'Studio A', 10, 50], ['20:00', 'yoga', 'lena', 'Studio B', 12, 60]]
const EVENING_B: Slot[] = [['18:30', 'yoga', 'lena', 'Studio B', 12, 60], ['20:00', 'hiit', 'tom', 'Studio A', 16, 40]]

// Indexed by Date.getDay(), Sunday first.
const TEMPLATE: Slot[][] = [
  [['10:00', 'yoga', 'lena', 'Studio A', 12, 60], ['11:15', 'pilates', 'bea', 'Studio B', 10, 50]],
  [...WEEKDAY, ...EVENING_A],
  [...WEEKDAY, ...EVENING_B],
  [...WEEKDAY, ...EVENING_A],
  [...WEEKDAY, ...EVENING_B],
  [...WEEKDAY, ...EVENING_A],
  [['09:00', 'spin', 'ana', 'Cycle Room', 14, 45], ['10:00', 'yoga', 'lena', 'Studio A', 12, 60], ['11:15', 'muay', 'kai', 'Dojo', 14, 60]],
]

// Members who often miss or cancel late, and members who stopped coming.
const FLAKY = ['m3', 'm8', 'm15', 'm27']
const GHOSTS = ['m21', 'm40', 'm55']

const MAYA_ROUTINE = ['spin|2|07:00', 'spin|4|07:00', 'pilates|1|18:30', 'pilates|3|18:30', 'yoga|6|10:00']
const LEO_ROUTINE = ['muay|1|18:00', 'muay|3|18:00', 'hiit|2|12:15']

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

export const buildStudio = (now: number): Studio => {
  const rand = mulberry32(20261008)
  const others = MEMBERS.map((m) => m.id).filter((id) => ![MAYA, LEO, SAM].includes(id))
  // Inactive members only appear in classes from more than three weeks ago.
  let ghostsAllowed = false
  const pick = (n: number, exclude: ID[] = []) =>
    others
      .filter((id) => !exclude.includes(id) && (ghostsAllowed || !GHOSTS.includes(id)))
      .map((id) => [rand(), id] as const)
      .sort((a, b) => a[0] - b[0])
      .slice(0, n)
      .map(([, id]) => id)

  let seq = 0
  const sessions: Session[] = []
  const today = startOfDay(now)

  for (let offset = -30; offset <= 45; offset++) {
    const day = addDays(today, offset)
    for (const [time, typeId, instructorId, room, capacity, durationMin] of TEMPLATE[new Date(day).getDay()]) {
      const start = at(day, time)
      ghostsAllowed = start < now - 21 * DAY
      const packed = rand() < 0.22
      const booked = pick(packed ? capacity : Math.round(capacity * (0.35 + rand() * 0.55)))
      const waitlist = packed ? pick(1 + Math.floor(rand() * 3), booked) : []
      const s: Session = {
        id: `s${++seq}`, typeId, instructorId, room, start, durationMin, capacity,
        status: 'scheduled', booked, waitlist, attendance: {}, lateCancels: [],
      }
      if (hasStarted(s, now)) {
        s.waitlist = []
        if (MAYA_ROUTINE.includes(seriesKey(s))) s.booked = [MAYA, ...s.booked.slice(1)]
        if (LEO_ROUTINE.includes(seriesKey(s))) s.booked = [LEO, ...s.booked.slice(1)]
        // Classes that already ran today are left unmarked, waiting for the front desk.
        for (const id of start < today ? s.booked : []) {
          const missChance = id === MAYA || id === LEO ? 0 : FLAKY.includes(id) ? 0.3 : 0.04
          s.attendance[id] = rand() < missChance ? 'absent' : 'present'
        }
        if (rand() < 0.12) s.lateCancels = pick(1, s.booked)
        const free = FLAKY.filter((id) => !s.booked.includes(id) && !s.lateCancels.includes(id))
        if (free.length && rand() < 0.1) s.lateCancels = [...s.lateCancels, free[Math.floor(rand() * free.length)]]
      }
      sessions.push(s)
    }
  }

  ghostsAllowed = false
  const upcoming = sessions.filter((s) => !hasStarted(s, now))
  const fill = (s: Session, front: ID[], queue: ID[]) => {
    const rest = pick(s.capacity - front.length)
    s.booked = [...rest, ...front]
    s.waitlist = [...queue, ...pick(2, rest)]
  }
  const seat = (s: Session | undefined, id: ID) => {
    if (!s || s.booked.includes(id)) return
    s.waitlist = s.waitlist.filter((w) => w !== id)
    s.booked = s.booked.length < s.capacity ? [...s.booked, id] : [...s.booked.slice(1), id]
  }

  // The class the demo revolves around: full tomorrow evening, Maya in, Leo first in line.
  const tomorrow = addDays(today, 1)
  const weekend = [0, 6].includes(new Date(tomorrow).getDay())
  const hero = upcoming.find((s) => s.start === at(tomorrow, weekend ? '10:00' : '18:30'))!
  fill(hero, [MAYA], [LEO])

  // Same situation inside the cutoff, to show late cancel and "first to book gets it".
  const half = 30 * 60000
  const soonStart = Math.ceil((now + 45 * 60000) / half) * half
  const soonDraft = { typeId: 'hiit', instructorId: 'rafa', start: soonStart, durationMin: 30, capacity: 10 }
  const soon: Session = {
    id: `s${++seq}`, ...soonDraft,
    room: ['Studio B', 'Studio A', 'Dojo'].find((room) => !scheduleClashes(sessions, { ...soonDraft, room }).room) ?? 'Studio B',
    status: 'scheduled', booked: [], waitlist: [], attendance: {}, lateCancels: [],
  }
  fill(soon, [MAYA], [LEO])
  sessions.push(soon)

  const later = upcoming.filter((s) => s.start > hero.start + 12 * 60 * 60000)
  seat(later.find((s) => MAYA_ROUTINE.includes(seriesKey(s))), MAYA)
  seat(later.find((s) => LEO_ROUTINE.includes(seriesKey(s))), LEO)

  sessions.sort((a, b) => a.start - b.start)

  const heroName = `${typeOf(hero.typeId).name}, ${fmtWhen(hero.start, now)}`
  const seen = { read: true, toasted: true }
  const notices: Notice[] = [
    {
      id: `n${++seq}`, memberId: MAYA, kind: 'reminder', sessionId: soon.id, at: now - 25 * 60000,
      title: 'Class starting soon', read: false, toasted: true,
      body: `HIIT, ${fmtWhen(soon.start, now)} in ${soon.room}. See you there!`,
    },
    {
      id: `n${++seq}`, memberId: MAYA, kind: 'favorite_open', sessionId: hero.id, at: now - 26 * 60 * 60000,
      title: 'Your usual class is open', ...seen,
      body: `Bookings are open for ${heroName}. It usually fills up fast.`,
    },
    {
      id: `n${++seq}`, memberId: MAYA, kind: 'booking_confirmed', sessionId: hero.id, at: now - 25 * 60 * 60000,
      title: 'Booking confirmed', ...seen,
      body: `You're booked for ${heroName}.`,
    },
    {
      id: `n${++seq}`, memberId: SAM, kind: 'reminder', at: now - 2 * 60 * 60000,
      title: 'Welcome to Ritmo', read: false, toasted: true,
      body: 'Book your first class from the schedule. Star the ones you want to repeat every week and they will wait for you on your home screen.',
    },
  ]

  return {
    seq,
    rules: DEFAULT_RULES,
    sessions,
    notices,
    favorites: {
      [MAYA]: [...new Set([seriesKey(hero), ...MAYA_ROUTINE])],
      [LEO]: LEO_ROUTINE,
    },
  }
}
