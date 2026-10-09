import { instructorOf, typeOf } from './catalog'
import { fmtWhen, toTimeInput } from '../lib/format'
import type { Attendance, ID, MemberPrefs, Notice, NoticeKind, Session, SessionDraft, Studio, StudioRules } from './types'

// Proposed defaults, editable by the studio. Waitlist auto-promotion and penalty-free
// cancellation both stop cutoffHours before class.
export const DEFAULT_RULES: StudioRules = { cutoffHours: 2, lateSpot: 'open', checkInMinutes: 90 }
export const CUTOFF_MS = DEFAULT_RULES.cutoffHours * 60 * 60 * 1000
export const rulesOf = (studio: Pick<Studio, 'rules'>): StudioRules => studio.rules ?? DEFAULT_RULES
export const FEW_SPOTS = 3

export const endOf = (s: Session) => s.start + s.durationMin * 60000
export const hasStarted = (s: Session, now: number) => now >= s.start
export const hasEnded = (s: Session, now: number) => now >= endOf(s)
export const insideCutoff = (s: Session, now: number, rules: StudioRules = DEFAULT_RULES) => s.start - now < rules.cutoffHours * 3600000
export const spotsLeft = (s: Session) => Math.max(0, s.capacity - s.booked.length)
export const isFull = (s: Session) => spotsLeft(s) === 0
export const waitlistPosition = (s: Session, memberId: ID) => s.waitlist.indexOf(memberId) + 1
export const isOpen = (s: Session, now: number) => s.status === 'scheduled' && !hasStarted(s, now)

export const seriesKey = (s: Pick<Session, 'typeId' | 'start'>) =>
  `${s.typeId}|${new Date(s.start).getDay()}|${toTimeInput(s.start)}`

// 'claim': the member is waiting and a spot is free that anyone can book (first to book gets it).
export type MemberState = 'booked' | 'waitlist' | 'claim' | 'open' | 'few' | 'full' | 'cancelled' | 'ended'

// Under the "hold" rule a free spot inside the cutoff is kept for the front desk to give,
// so members cannot book it themselves.
export const isHeld = (s: Session, now: number, rules: StudioRules = DEFAULT_RULES) =>
  rules.lateSpot === 'hold' && !isFull(s) && s.waitlist.length > 0 && insideCutoff(s, now, rules)

export const memberState = (s: Session, memberId: ID, now: number, rules: StudioRules = DEFAULT_RULES): MemberState => {
  if (s.status === 'cancelled') return 'cancelled'
  if (hasStarted(s, now)) return 'ended'
  if (s.booked.includes(memberId)) return 'booked'
  const held = isHeld(s, now, rules)
  if (s.waitlist.includes(memberId)) return isFull(s) || held ? 'waitlist' : 'claim'
  if (isFull(s) || held) return 'full'
  return spotsLeft(s) <= FEW_SPOTS ? 'few' : 'open'
}

export const conflictFor = (studio: Studio, session: Session, memberId: ID) =>
  studio.sessions.find(
    (o) =>
      o.id !== session.id &&
      o.status === 'scheduled' &&
      o.booked.includes(memberId) &&
      o.start < endOf(session) &&
      session.start < endOf(o),
  )

const label = (s: Session, now: number) => `${typeOf(s.typeId).name}, ${fmtWhen(s.start, now)}`

const patch = (studio: Studio, sessionId: ID, fn: (s: Session) => Session): Studio => ({
  ...studio,
  sessions: studio.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
})

const find = (studio: Studio, sessionId: ID) => studio.sessions.find((s) => s.id === sessionId)

interface NoticeInput {
  memberId: ID
  kind: NoticeKind
  title: string
  body: string
  sessionId?: ID
  // The member triggered this themselves and already saw feedback, so no toast.
  silent?: boolean
}

const notify = (studio: Studio, now: number, ...inputs: NoticeInput[]): Studio => {
  let seq = studio.seq
  const added: Notice[] = inputs.map(({ silent, ...n }) => ({
    ...n,
    id: `n${++seq}`,
    at: now,
    read: false,
    toasted: !!silent,
  }))
  return { ...studio, seq, notices: [...added, ...studio.notices] }
}

// Fills free spots from the waitlist. Outside the cutoff the first in line is booked
// automatically. Inside it the studio's lateSpot rule decides: alert everyone waiting,
// keep promoting in order, or leave the spot for the front desk.
const fillSpots = (studio: Studio, sessionId: ID, now: number): Studio => {
  const rules = rulesOf(studio)
  let next = studio
  for (;;) {
    const s = find(next, sessionId)
    if (!s || !isOpen(s, now) || isFull(s) || s.waitlist.length === 0) return next
    const late = insideCutoff(s, now, rules)
    if (late && rules.lateSpot === 'hold') return next
    if (late && rules.lateSpot === 'open') {
      return notify(
        next,
        now,
        ...s.waitlist.map((memberId) => ({
          memberId,
          kind: 'spot_open' as const,
          title: 'A spot just opened',
          body: `${label(s, now)} has a free spot. It starts soon, so the first to book gets it.`,
          sessionId,
        })),
      )
    }
    const [memberId, ...rest] = s.waitlist
    next = patch(next, sessionId, (x) => ({ ...x, booked: [...x.booked, memberId], waitlist: rest }))
    next = notify(next, now, {
      memberId,
      kind: 'promoted',
      title: "You're in!",
      body: `A spot opened and you're now booked for ${label(s, now)}.${late ? ' It starts soon, so cancel if you can no longer make it.' : ''}`,
      sessionId,
    })
  }
}

export const book = (studio: Studio, sessionId: ID, memberId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now) || isFull(s) || s.booked.includes(memberId) || isHeld(s, now, rulesOf(studio))) return studio
  const next = patch(studio, sessionId, (x) => ({
    ...x,
    booked: [...x.booked, memberId],
    waitlist: x.waitlist.filter((id) => id !== memberId),
  }))
  return notify(next, now, {
    memberId,
    kind: 'booking_confirmed',
    title: 'Booking confirmed',
    body: `You're booked for ${label(s, now)} with ${instructorOf(s.instructorId).name}.`,
    sessionId,
    silent: true,
  })
}

export const joinWaitlist = (studio: Studio, sessionId: ID, memberId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now) || !(isFull(s) || isHeld(s, now, rulesOf(studio)))) return studio
  if (s.booked.includes(memberId) || s.waitlist.includes(memberId)) return studio
  return patch(studio, sessionId, (x) => ({ ...x, waitlist: [...x.waitlist, memberId] }))
}

export const leaveWaitlist = (studio: Studio, sessionId: ID, memberId: ID): Studio =>
  patch(studio, sessionId, (x) => ({ ...x, waitlist: x.waitlist.filter((id) => id !== memberId) }))

export const cancelBooking = (studio: Studio, sessionId: ID, memberId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now) || !s.booked.includes(memberId)) return studio
  const late = insideCutoff(s, now, rulesOf(studio))
  const next = patch(studio, sessionId, (x) => ({
    ...x,
    booked: x.booked.filter((id) => id !== memberId),
    lateCancels: late ? [...x.lateCancels, memberId] : x.lateCancels,
  }))
  return fillSpots(next, sessionId, now)
}

export const cancelSession = (studio: Studio, sessionId: ID, reason: string, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now)) return studio
  const next = patch(studio, sessionId, (x) => ({
    ...x,
    status: 'cancelled',
    cancelReason: reason,
    waitlist: [],
  }))
  return notify(
    next,
    now,
    ...[...s.booked, ...s.waitlist].map((memberId) => ({
      memberId,
      kind: 'class_cancelled' as const,
      title: 'Class cancelled',
      body: `${label(s, now)} was cancelled by the studio${reason ? `: ${reason}` : '.'} Sorry for the change of plans.`,
      sessionId,
    })),
  )
}

export const changeInstructor = (studio: Studio, sessionId: ID, instructorId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now) || s.instructorId === instructorId) return studio
  const next = patch(studio, sessionId, (x) => ({ ...x, instructorId }))
  return notify(
    next,
    now,
    ...[...s.booked, ...s.waitlist].map((memberId) => ({
      memberId,
      kind: 'class_changed' as const,
      title: 'New instructor',
      body: `${label(s, now)} will be taught by ${instructorOf(instructorId).name} instead of ${instructorOf(s.instructorId).name}. Your spot is unchanged.`,
      sessionId,
    })),
  )
}

// Front desk booking on a member's behalf: takes a spot if there is one, otherwise joins the waitlist.
export const adminAdd = (studio: Studio, sessionId: ID, memberId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now) || s.booked.includes(memberId)) return studio
  if (isFull(s)) return joinWaitlist(studio, sessionId, memberId, now)
  const next = patch(studio, sessionId, (x) => ({
    ...x,
    booked: [...x.booked, memberId],
    waitlist: x.waitlist.filter((id) => id !== memberId),
  }))
  return notify(next, now, {
    memberId,
    kind: 'booking_confirmed',
    title: 'Booked by the front desk',
    body: `The Ritmo team booked you for ${label(s, now)}.`,
    sessionId,
  })
}

// The front desk gives a free spot to someone on the waitlist, whatever their position.
export const adminPromote = (studio: Studio, sessionId: ID, memberId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now) || isFull(s) || !s.waitlist.includes(memberId)) return studio
  const next = patch(studio, sessionId, (x) => ({
    ...x,
    booked: [...x.booked, memberId],
    waitlist: x.waitlist.filter((id) => id !== memberId),
  }))
  return notify(next, now, {
    memberId,
    kind: 'promoted',
    title: "You're in!",
    body: `The front desk gave you a spot in ${label(s, now)}.`,
    sessionId,
  })
}

export const setRules = (studio: Studio, rules: StudioRules): Studio => ({ ...studio, rules })

export const adminRemove = (studio: Studio, sessionId: ID, memberId: ID, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now)) return studio
  if (s.waitlist.includes(memberId)) return leaveWaitlist(studio, sessionId, memberId)
  if (!s.booked.includes(memberId)) return studio
  let next = patch(studio, sessionId, (x) => ({ ...x, booked: x.booked.filter((id) => id !== memberId) }))
  next = notify(next, now, {
    memberId,
    kind: 'removed',
    title: 'Booking removed',
    body: `The Ritmo team removed your booking for ${label(s, now)}. Talk to the front desk if this looks wrong.`,
    sessionId,
  })
  return fillSpots(next, sessionId, now)
}

export const setAttendance = (studio: Studio, sessionId: ID, memberId: ID, value: Attendance | null): Studio =>
  patch(studio, sessionId, (x) => {
    const attendance = { ...x.attendance }
    if (value) attendance[memberId] = value
    else delete attendance[memberId]
    return { ...x, attendance }
  })

// Booked members with no attendance mark once the class is over. They are shown as
// "not checked in" rather than counted as no-shows, so a forgotten check-in never penalises anyone.
export const uncheckedIn = (s: Session, now: number) =>
  s.status === 'scheduled' && hasEnded(s, now) ? s.booked.filter((id) => !s.attendance[id]) : []

// Upcoming classes with a free spot and people waiting, held for the front desk to give.
// Only the "hold" rule leaves this to staff; the other rules fill or advertise the spot themselves.
export const heldSpots = (studio: Studio, now: number) =>
  rulesOf(studio).lateSpot === 'hold'
    ? studio.sessions.filter((s) => isOpen(s, now) && !isFull(s) && s.waitlist.length > 0)
    : []

export const markAllPresent = (studio: Studio, sessionId: ID): Studio =>
  patch(studio, sessionId, (x) => ({
    ...x,
    attendance: Object.fromEntries(x.booked.map((id) => [id, x.attendance[id] ?? 'present'])),
  }))

export const createSessions = (studio: Studio, draft: SessionDraft, weeks: number): Studio => {
  let seq = studio.seq
  const added: Session[] = Array.from({ length: Math.max(1, weeks) }, (_, i) => {
    const d = new Date(draft.start)
    d.setDate(d.getDate() + i * 7)
    return {
      ...draft,
      id: `s${++seq}`,
      start: d.getTime(),
      status: 'scheduled',
      booked: [],
      waitlist: [],
      attendance: {},
      lateCancels: [],
    }
  })
  return { ...studio, seq, sessions: [...studio.sessions, ...added].sort((a, b) => a.start - b.start) }
}

export const updateSession = (studio: Studio, sessionId: ID, draft: SessionDraft, now: number): Studio => {
  const s = find(studio, sessionId)
  if (!s || !isOpen(s, now)) return studio
  let next = changeInstructor(studio, sessionId, draft.instructorId, now)
  const moved = draft.start !== s.start || draft.room !== s.room
  next = patch(next, sessionId, (x) => ({ ...x, ...draft }))
  next = { ...next, sessions: [...next.sessions].sort((a, b) => a.start - b.start) }
  if (moved) {
    const updated = find(next, sessionId)!
    next = notify(
      next,
      now,
      ...[...s.booked, ...s.waitlist].map((memberId) => ({
        memberId,
        kind: 'class_changed' as const,
        title: 'Class updated',
        body: `${typeOf(s.typeId).name} (was ${fmtWhen(s.start, now)}) is now ${fmtWhen(updated.start, now)} in ${updated.room}. Your spot is unchanged.`,
        sessionId,
      })),
    )
  }
  return fillSpots(next, sessionId, now)
}

export const DEFAULT_PREFS: MemberPrefs = { reminderMin: 60, email: true }
export const prefsOf = (studio: Pick<Studio, 'prefs'>, memberId: ID): MemberPrefs => studio.prefs?.[memberId] ?? DEFAULT_PREFS

export const setPrefs = (studio: Studio, memberId: ID, prefs: MemberPrefs): Studio => ({
  ...studio,
  prefs: { ...studio.prefs, [memberId]: prefs },
})

// Sends each member's class reminder once, when the class enters their reminder window.
export const dueReminders = (studio: Studio, now: number): Studio => {
  const sent = new Set(studio.notices.filter((n) => n.kind === 'reminder' && n.sessionId).map((n) => `${n.memberId}|${n.sessionId}`))
  const due: NoticeInput[] = []
  for (const s of studio.sessions) {
    if (!isOpen(s, now)) continue
    for (const memberId of s.booked) {
      const { reminderMin } = prefsOf(studio, memberId)
      if (!reminderMin || s.start - now > reminderMin * 60000 || sent.has(`${memberId}|${s.id}`)) continue
      due.push({
        memberId,
        kind: 'reminder',
        title: 'Class starting soon',
        body: `${label(s, now)} in ${s.room} with ${instructorOf(s.instructorId).name}. See you there!`,
        sessionId: s.id,
      })
    }
  }
  return due.length ? notify(studio, now, ...due) : studio
}

export const toggleFavorite = (studio: Studio, memberId: ID, key: string): Studio => {
  const current = studio.favorites[memberId] ?? []
  const favorites = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
  return { ...studio, favorites: { ...studio.favorites, [memberId]: favorites } }
}

export const markRead = (studio: Studio, memberId: ID): Studio => ({
  ...studio,
  notices: studio.notices.map((n) => (n.memberId === memberId ? { ...n, read: true } : n)),
})

// Clears notifications from a member's inbox: the given ones, or all of them.
export const dismissNotices = (studio: Studio, memberId: ID, ids?: ID[]): Studio => ({
  ...studio,
  notices: studio.notices.map((n) => (n.memberId === memberId && (!ids || ids.includes(n.id)) ? { ...n, dismissed: true, read: true } : n)),
})

export const markToasted = (studio: Studio, ids: ID[]): Studio => ({
  ...studio,
  notices: studio.notices.map((n) => (ids.includes(n.id) ? { ...n, toasted: true } : n)),
})

// Two classes cannot share a room, and an instructor cannot teach two at once.
export const scheduleClashes = (sessions: Session[], draft: SessionDraft, ignoreId?: ID) => {
  const end = draft.start + draft.durationMin * 60000
  const overlapping = sessions.filter(
    (s) => s.id !== ignoreId && s.status === 'scheduled' && s.start < end && draft.start < endOf(s),
  )
  return {
    room: overlapping.find((s) => s.room === draft.room),
    instructor: overlapping.find((s) => s.instructorId === draft.instructorId),
  }
}

export const OPEN_HOUR = 6
export const CLOSE_HOUR = 22

// Gaps in a room's day long enough for a class of the given length, from opening (or now) to closing.
export const freeWindows = (
  sessions: Session[],
  room: string,
  day: number,
  durationMin: number,
  now: number,
  ignoreId?: ID,
): { start: number; end: number }[] => {
  const at = (h: number) => new Date(day).setHours(h, 0, 0, 0)
  const quarter = 15 * 60000
  const busy = sessions
    .filter((s) => s.room === room && s.status === 'scheduled' && s.id !== ignoreId && s.start < at(CLOSE_HOUR) && endOf(s) > at(OPEN_HOUR))
    .sort((a, b) => a.start - b.start)
  const windows: { start: number; end: number }[] = []
  let cursor = Math.max(at(OPEN_HOUR), Math.ceil(now / quarter) * quarter)
  for (const s of [...busy, { start: at(CLOSE_HOUR), durationMin: 0 } as Session]) {
    if (s.start - cursor >= durationMin * 60000) windows.push({ start: cursor, end: s.start })
    // Classes start on the quarter hour, so a gap after a 50-minute class opens at the next quarter.
    cursor = Math.max(cursor, Math.ceil(endOf(s) / quarter) * quarter)
  }
  return windows
}

// Picks a start time for a new class: the first free slot that fits it. Undefined when nothing fits.
export const suggestStart = (windows: { start: number; end: number }[]) => windows[0]?.start

export type Attention = 'demand' | 'low'

// Flags upcoming classes worth a decision: enough people waiting to justify another class,
// or so few booked close to start that it may not be worth running.
export const attentionFor = (s: Session, now: number): Attention | null => {
  if (!isOpen(s, now)) return null
  if (isFull(s) && s.waitlist.length >= 2) return 'demand'
  if (s.start - now < 24 * 60 * 60 * 1000 && s.booked.length < s.capacity * 0.4) return 'low'
  return null
}
