export type ID = string

export interface ClassType {
  id: ID
  name: string
  color: string
  tint: string
  blurb: string
  image: string
}

export interface Instructor {
  id: ID
  name: string
  // Optional: the studio uploads it. Without one we show initials.
  photo?: string
}

export interface Member {
  id: ID
  name: string
  email: string
  // Joined recently, so no history is expected yet.
  isNew?: boolean
}

export type Attendance = 'present' | 'absent'

export interface Session {
  id: ID
  typeId: ID
  instructorId: ID
  room: string
  start: number
  durationMin: number
  capacity: number
  status: 'scheduled' | 'cancelled'
  cancelReason?: string
  booked: ID[]
  waitlist: ID[]
  attendance: Record<ID, Attendance>
  lateCancels: ID[]
}

export type NoticeKind =
  | 'booking_confirmed'
  | 'promoted'
  | 'spot_open'
  | 'class_cancelled'
  | 'class_changed'
  | 'removed'
  | 'reminder'
  | 'favorite_open'

export interface Notice {
  id: ID
  memberId: ID
  kind: NoticeKind
  title: string
  body: string
  sessionId?: ID
  at: number
  read: boolean
  toasted: boolean
  // Cleared from the member's inbox. Kept so a reminder is never sent twice.
  dismissed?: boolean
}

// What happens when a spot opens inside the cutoff: alert the whole waitlist (first to book
// gets it), give it to the next in line, or hold it for the front desk to decide.
export type LateSpot = 'open' | 'next' | 'hold'

export interface StudioRules {
  cutoffHours: number
  lateSpot: LateSpot
  checkInMinutes: number
}

// Per-member notification preferences. reminderMin 0 means no reminder.
export interface MemberPrefs {
  reminderMin: number
  email: boolean
}

export interface Studio {
  seq: number
  prefs?: Record<ID, MemberPrefs>
  // Optional so older saved data and test fixtures fall back to the defaults.
  rules?: StudioRules
  sessions: Session[]
  notices: Notice[]
  favorites: Record<ID, string[]>
}

export interface SessionDraft {
  typeId: ID
  instructorId: ID
  room: string
  start: number
  durationMin: number
  capacity: number
}
