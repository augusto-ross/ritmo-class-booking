import { describe, expect, it } from 'vitest'
import {
  adminPromote,
  dismissNotices,
  dueReminders,
  setPrefs,
  freeWindows,
  suggestStart,
  heldSpots,
  adminRemove,
  attentionFor,
  book,
  checkInOpen,
  presentCount,
  cancelBooking,
  cancelSession,
  changeInstructor,
  CUTOFF_MS,
  joinWaitlist,
  markAllPresent,
  memberState,
  uncheckedIn,
  scheduleClashes,
  setRules,
  updateSession,
} from './rules'
import { buildStudio } from './seed'
import { toIcs } from '../lib/calendar'
import type { Session, Studio } from './types'

const NOW = new Date(2026, 9, 8, 10, 0).getTime()
const HOUR = 60 * 60 * 1000

const session = (over: Partial<Session> = {}): Session => ({
  id: 's1',
  typeId: 'spin',
  instructorId: 'ana',
  room: 'Cycle Room',
  start: NOW + 24 * HOUR,
  durationMin: 45,
  capacity: 2,
  status: 'scheduled',
  booked: ['m1', 'm2'],
  waitlist: ['m3', 'm4'],
  attendance: {},
  lateCancels: [],
  ...over,
})

const studio = (s: Session): Studio => ({ seq: 100, sessions: [s], notices: [], favorites: {} })
const only = (st: Studio) => st.sessions[0]
const kinds = (st: Studio, memberId: string) => st.notices.filter((n) => n.memberId === memberId).map((n) => n.kind)

describe('booking', () => {
  it('books into a free spot and confirms silently', () => {
    const st = book(studio(session({ booked: ['m1'], waitlist: [] })), 's1', 'm5', NOW)
    expect(only(st).booked).toEqual(['m1', 'm5'])
    expect(st.notices[0]).toMatchObject({ memberId: 'm5', kind: 'booking_confirmed', toasted: true })
  })

  it('refuses to book a full class, and queues in order instead', () => {
    let st = studio(session())
    expect(book(st, 's1', 'm5', NOW)).toBe(st)
    st = joinWaitlist(st, 's1', 'm5', NOW)
    expect(only(st).waitlist).toEqual(['m3', 'm4', 'm5'])
  })

  it('does not double-book or queue someone already in', () => {
    const st = studio(session())
    expect(joinWaitlist(st, 's1', 'm1', NOW)).toBe(st)
    expect(joinWaitlist(st, 's1', 'm3', NOW)).toBe(st)
  })
})

describe('cancelling outside the cutoff', () => {
  it('promotes the first in line and tells only them', () => {
    const st = cancelBooking(studio(session()), 's1', 'm1', NOW)
    expect(only(st).booked).toEqual(['m2', 'm3'])
    expect(only(st).waitlist).toEqual(['m4'])
    expect(only(st).lateCancels).toEqual([])
    expect(kinds(st, 'm3')).toEqual(['promoted'])
    expect(kinds(st, 'm4')).toEqual([])
  })
})

describe('cancelling inside the cutoff', () => {
  const soon = () => studio(session({ start: NOW + CUTOFF_MS - 60000 }))

  it('records a late cancel and books nobody automatically', () => {
    const st = cancelBooking(soon(), 's1', 'm1', NOW)
    expect(only(st).booked).toEqual(['m2'])
    expect(only(st).waitlist).toEqual(['m3', 'm4'])
    expect(only(st).lateCancels).toEqual(['m1'])
  })

  it('tells the whole waitlist, and the first to book gets the spot', () => {
    let st = cancelBooking(soon(), 's1', 'm1', NOW)
    expect(kinds(st, 'm3')).toEqual(['spot_open'])
    expect(kinds(st, 'm4')).toEqual(['spot_open'])
    st = book(st, 's1', 'm4', NOW)
    expect(only(st).booked).toEqual(['m2', 'm4'])
    expect(only(st).waitlist).toEqual(['m3'])
  })
})

describe('studio changes', () => {
  it('cancelling a class notifies everyone booked or waiting', () => {
    const st = cancelSession(studio(session()), 's1', 'Instructor is unwell', NOW)
    expect(only(st).status).toBe('cancelled')
    expect(only(st).waitlist).toEqual([])
    expect(st.notices.map((n) => n.memberId).sort()).toEqual(['m1', 'm2', 'm3', 'm4'])
    expect(st.notices.every((n) => n.kind === 'class_cancelled')).toBe(true)
  })

  it('swapping the instructor keeps every spot', () => {
    const st = changeInstructor(studio(session()), 's1', 'rafa', NOW)
    expect(only(st).booked).toEqual(['m1', 'm2'])
    expect(st.notices).toHaveLength(4)
  })

  it('raising capacity pulls people off the waitlist', () => {
    const s = session()
    const st = updateSession(studio(s), 's1', { ...s, capacity: 3 }, NOW)
    expect(only(st).booked).toEqual(['m1', 'm2', 'm3'])
    expect(kinds(st, 'm3')).toEqual(['promoted'])
  })

  it('removing a member at the front desk is not a late cancel and frees the spot', () => {
    const st = adminRemove(studio(session()), 's1', 'm1', NOW)
    expect(only(st).lateCancels).toEqual([])
    expect(only(st).booked).toEqual(['m2', 'm3'])
    expect(kinds(st, 'm1')).toEqual(['removed'])
  })
})

describe('demo seed', () => {
  const st = buildStudio(NOW)
  const mine = (id: string) => st.sessions.filter((s) => s.start > NOW && s.booked.includes(id))

  it('has a full class tomorrow with Maya booked and Leo first in line', () => {
    const hero = mine('maya').find((s) => s.start - NOW >= CUTOFF_MS && s.waitlist[0] === 'leo')!
    expect(hero.booked).toHaveLength(hero.capacity)
    const after = cancelBooking(st, hero.id, 'maya', NOW)
    expect(after.sessions.find((s) => s.id === hero.id)!.booked).toContain('leo')
  })

  it('has a full class inside the cutoff with Maya booked and Leo waiting', () => {
    const soon = mine('maya').find((s) => s.start - NOW < CUTOFF_MS)!
    expect(soon.booked).toHaveLength(soon.capacity)
    expect(soon.waitlist[0]).toBe('leo')
  })

  it('never overbooks', () => {
    expect(st.sessions.every((s) => s.booked.length <= s.capacity)).toBe(true)
  })
})

describe('admin calendar helpers', () => {
  const base = session({ start: NOW + 24 * HOUR, durationMin: 60 })
  const draft = { typeId: 'yoga', instructorId: 'lena', room: 'Studio A', start: base.start + 30 * 60000, durationMin: 45, capacity: 10 }

  it('reports a room or instructor already taken at that time', () => {
    expect(scheduleClashes([base], { ...draft, room: 'Cycle Room' }).room).toBe(base)
    expect(scheduleClashes([base], { ...draft, instructorId: 'ana' }).instructor).toBe(base)
    expect(scheduleClashes([base], draft)).toEqual({ room: undefined, instructor: undefined })
  })

  it('ignores the class being edited and classes that do not overlap', () => {
    expect(scheduleClashes([base], { ...draft, room: 'Cycle Room' }, 's1').room).toBeUndefined()
    expect(scheduleClashes([base], { ...draft, room: 'Cycle Room', start: base.start + 60 * 60000 }).room).toBeUndefined()
  })

  it('flags high demand and low bookings', () => {
    expect(attentionFor(base, NOW)).toBe('demand')
    expect(attentionFor(session({ booked: [], waitlist: [], capacity: 10, start: NOW + 5 * HOUR }), NOW)).toBe('low')
    expect(attentionFor(session({ booked: [], waitlist: [], capacity: 10, start: NOW + 72 * HOUR }), NOW)).toBeNull()
  })
})

describe('check-in', () => {
  const ended = () => session({ start: NOW - 2 * HOUR, durationMin: 45, booked: ['m1', 'm2', 'm3'], waitlist: [], attendance: { m2: 'absent' } })

  it('lists booked members left without a mark once the class is over', () => {
    expect(uncheckedIn(ended(), NOW)).toEqual(['m1', 'm3'])
    expect(uncheckedIn(session({ attendance: {} }), NOW)).toEqual([])
  })

  it('counts members marked present', () => {
    expect(presentCount(session({ booked: ['m1', 'm2', 'm3'], attendance: { m1: 'present', m2: 'absent' } }))).toBe(1)
  })

  it('opens check-in the set minutes before the start, never for a cancelled class', () => {
    const rules = { cutoffHours: 2, lateSpot: 'open' as const, checkInMinutes: 90 }
    expect(checkInOpen(session({ start: NOW + HOUR }), NOW, rules)).toBe(true)
    expect(checkInOpen(session({ start: NOW + 2 * HOUR }), NOW, rules)).toBe(false)
    expect(checkInOpen(ended(), NOW, rules)).toBe(true)
    expect(checkInOpen(session({ start: NOW - HOUR, status: 'cancelled' }), NOW, rules)).toBe(false)
  })

  it('marks everyone still unmarked as present, keeping existing marks', () => {
    const st = markAllPresent(studio(ended()), 's1')
    expect(only(st).attendance).toEqual({ m1: 'present', m2: 'absent', m3: 'present' })
    expect(uncheckedIn(only(st), NOW)).toEqual([])
  })
})

describe('studio rules', () => {
  const soon = (lateSpot: 'open' | 'next' | 'hold') =>
    setRules(studio(session({ start: NOW + HOUR })), { cutoffHours: 2, lateSpot, checkInMinutes: 90 })

  it('can give a late spot straight to the next in line', () => {
    const st = cancelBooking(soon('next'), 's1', 'm1', NOW)
    expect(only(st).booked).toEqual(['m2', 'm3'])
    expect(kinds(st, 'm3')).toEqual(['promoted'])
    expect(kinds(st, 'm4')).toEqual([])
  })

  it('can hold a late spot for the front desk, telling nobody', () => {
    const st = cancelBooking(soon('hold'), 's1', 'm1', NOW)
    expect(only(st).booked).toEqual(['m2'])
    expect(st.notices).toEqual([])
  })

  it('uses the configured cutoff for late cancels', () => {
    const wide = setRules(studio(session({ start: NOW + 5 * HOUR })), { cutoffHours: 6, lateSpot: 'open', checkInMinutes: 90 })
    expect(only(cancelBooking(wide, 's1', 'm1', NOW)).lateCancels).toEqual(['m1'])
  })

  it('lets the front desk give a free spot to anyone waiting', () => {
    const held = cancelBooking(soon('hold'), 's1', 'm1', NOW)
    const st = adminPromote(held, 's1', 'm4', NOW)
    expect(only(st).booked).toEqual(['m2', 'm4'])
    expect(only(st).waitlist).toEqual(['m3'])
    expect(kinds(st, 'm4')).toEqual(['promoted'])
    expect(adminPromote(st, 's1', 'm3', NOW)).toBe(st)
  })
})

describe('held spots', () => {
  it('lists classes waiting on the front desk only under the hold rule', () => {
    const base = studio(session({ start: NOW + HOUR }))
    const hold = cancelBooking(setRules(base, { cutoffHours: 2, lateSpot: 'hold', checkInMinutes: 90 }), 's1', 'm1', NOW)
    expect(heldSpots(hold, NOW).map((s) => s.id)).toEqual(['s1'])
    const open = cancelBooking(base, 's1', 'm1', NOW)
    expect(heldSpots(open, NOW)).toEqual([])
  })

  it('lets members join the line of a class whose free spot is held', () => {
    const base = studio(session({ start: NOW + HOUR }))
    const hold = cancelBooking(setRules(base, { cutoffHours: 2, lateSpot: 'hold', checkInMinutes: 90 }), 's1', 'm1', NOW)
    expect(only(joinWaitlist(hold, 's1', 'm9', NOW)).waitlist).toEqual(['m3', 'm4', 'm9'])
  })
})

describe('sample data personas', () => {
  it('gives Leo a past routine, so he is not shown as inactive', () => {
    const st = buildStudio(NOW)
    expect(st.sessions.some((s) => s.start < NOW && s.attendance.leo === 'present')).toBe(true)
    expect(st.sessions.some((s) => s.start < NOW && (s.booked.includes('sam') || s.waitlist.includes('sam')))).toBe(false)
  })
})

describe('free windows', () => {
  const day = new Date(2026, 9, 12).getTime()
  const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m).getTime()
  const classes = [session({ id: 'a', start: at(7), durationMin: 45 }), session({ id: 'b', start: at(12), durationMin: 60 })]

  it('returns the gaps around booked classes that fit the duration', () => {
    expect(freeWindows(classes, 'Cycle Room', day, 60, at(0))).toEqual([
      { start: at(6), end: at(7) },
      { start: at(7, 45), end: at(12) },
      { start: at(13), end: at(22) },
    ])
  })

  it('skips gaps that are too short, other rooms, and the class being edited', () => {
    expect(freeWindows(classes, 'Cycle Room', day, 90, at(0)).map((w) => w.start)).toEqual([at(7, 45), at(13)])
    expect(freeWindows(classes, 'Dojo', day, 60, at(0))).toEqual([{ start: at(6), end: at(22) }])
    expect(freeWindows(classes, 'Cycle Room', day, 60, at(0), 'b').at(-1)).toEqual({ start: at(7, 45), end: at(22) })
  })

  it('opens gaps on the quarter hour after an odd-length class', () => {
    const odd = [session({ start: at(8, 15), durationMin: 50 })]
    expect(freeWindows(odd, 'Cycle Room', day, 60, at(0))[1].start).toBe(at(9, 15))
  })

  it('starts from now on the current day', () => {
    expect(freeWindows(classes, 'Cycle Room', day, 60, at(14, 5))[0]).toEqual({ start: at(14, 15), end: at(22) })
  })
})

describe('class reminders', () => {
  const soon = () => studio(session({ start: NOW + 50 * 60000 }))

  it('reminds booked members once, inside their reminder window', () => {
    const st = dueReminders(soon(), NOW)
    expect(st.notices.map((n) => n.memberId).sort()).toEqual(['m1', 'm2'])
    expect(st.notices.every((n) => n.kind === 'reminder')).toBe(true)
    expect(dueReminders(st, NOW + 60000)).toBe(st)
  })

  it('respects each member\'s setting', () => {
    let st = setPrefs(soon(), 'm1', { reminderMin: 0, email: true })
    st = setPrefs(st, 'm2', { reminderMin: 30, email: true })
    expect(dueReminders(st, NOW).notices).toEqual([])
    expect(dueReminders(st, NOW + 25 * 60000).notices.map((n) => n.memberId)).toEqual(['m2'])
  })

  it('does not remind people who are only waiting', () => {
    expect(dueReminders(soon(), NOW).notices.some((n) => ['m3', 'm4'].includes(n.memberId))).toBe(false)
  })
})

describe('claiming a late spot', () => {
  const late = (lateSpot: 'open' | 'hold') =>
    cancelBooking(setRules(studio(session({ start: NOW + HOUR })), { cutoffHours: 2, lateSpot, checkInMinutes: 90 }), 's1', 'm1', NOW)

  it('lets anyone waiting book the free spot, and shows it to them as claimable', () => {
    const st = late('open')
    expect(memberState(only(st), 'm4', NOW, st.rules)).toBe('claim')
    const booked = book(st, 's1', 'm4', NOW)
    expect(only(booked).booked).toContain('m4')
    expect(only(booked).waitlist).toEqual(['m3'])
  })

  it('keeps a held spot for the front desk', () => {
    const st = late('hold')
    expect(memberState(only(st), 'm3', NOW, st.rules)).toBe('waitlist')
    expect(memberState(only(st), 'm9', NOW, st.rules)).toBe('full')
    expect(book(st, 's1', 'm3', NOW)).toBe(st)
  })
})

describe('suggested start time', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m).getTime()

  it('is the first free slot that fits', () => {
    expect(suggestStart([{ start: at(9, 15), end: at(18, 30) }, { start: at(19, 30), end: at(22) }])).toBe(at(9, 15))
    expect(suggestStart([])).toBeUndefined()
  })
})

describe('clearing notifications', () => {
  it('hides one or all of a member\'s notifications without sending reminders again', () => {
    const reminded = dueReminders(studio(session({ start: NOW + 30 * 60000 })), NOW)
    const one = dismissNotices(reminded, 'm1', [reminded.notices.find((n) => n.memberId === 'm1')!.id])
    expect(one.notices.filter((n) => n.dismissed).map((n) => n.memberId)).toEqual(['m1'])
    const all = dismissNotices(one, 'm2')
    expect(all.notices.every((n) => n.dismissed)).toBe(true)
    expect(dueReminders(all, NOW + 60000)).toBe(all)
  })
})

describe('add to calendar', () => {
  it('builds an event with the class, room and exact times', () => {
    const ics = toIcs(session({ start: Date.UTC(2026, 9, 13, 18, 30), durationMin: 45 }))
    expect(ics).toContain('DTSTART:20261013T183000Z')
    expect(ics).toContain('DTEND:20261013T191500Z')
    expect(ics).toContain('SUMMARY:Spinning at Ritmo')
    expect(ics).toContain('LOCATION:Ritmo Studio\\, Cycle Room')
  })
})
