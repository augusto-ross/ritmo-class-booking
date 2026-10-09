import type { ReactNode } from 'react'
import { Ban, Check, ChevronRight, Flame, Hourglass, Star, Users } from 'lucide-react'
import { Button, cx } from '../components/ui'
import { instructorOf, typeOf } from '../domain/catalog'
import {
  book,
  cancelBooking,
  joinWaitlist,
  leaveWaitlist,
  memberState,
  rulesOf,
  seriesKey,
  spotsLeft,
  toggleFavorite,
  waitlistPosition,
  type MemberState,
} from '../domain/rules'
import type { ID, Session, Studio } from '../domain/types'
import { fmtDay, fmtTime, fmtWhen } from '../lib/format'
import { useApp, useToasts, type Scope } from '../store'

const ordinal = (n: number) => `#${n}`

export function StatePill({ session, memberId, now }: { session: Session; memberId: ID; now: number }) {
  const rules = useApp((s) => rulesOf(s.studio))
  const state = memberState(session, memberId, now, rules)
  const left = spotsLeft(session)
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold'
  switch (state) {
    case 'booked':
      return <span className={cx(base, 'bg-ok-soft text-ok')}><Check className="h-3 w-3" strokeWidth={3} />Booked</span>
    case 'claim':
      return <span className={cx(base, 'bg-ok-soft text-ok')}><Flame className="h-3 w-3" />Spot open · book now</span>
    case 'waitlist':
      return <span className={cx(base, 'bg-warn-soft text-warn')}><Hourglass className="h-3 w-3" />{ordinal(waitlistPosition(session, memberId))} on waitlist</span>
    case 'few':
      return <span className={cx(base, 'bg-brand-soft text-brand')}><Flame className="h-3 w-3" />{left} {left === 1 ? 'spot' : 'spots'} left</span>
    case 'full':
      return <span className={cx(base, 'bg-ink/8 text-ink')}><Users className="h-3 w-3" />Full{session.waitlist.length > 0 && ` · ${session.waitlist.length} waiting`}</span>
    case 'cancelled':
      return <span className={cx(base, 'bg-danger-soft text-danger')}><Ban className="h-3 w-3" />Cancelled</span>
    case 'ended':
      return <span className={cx(base, 'bg-ink/5 text-muted')}>Ended</span>
    default:
      return <span className={cx(base, 'px-0 font-medium text-muted')}>{left} spots left</span>
  }
}

// Every member action goes through here so each one gets the same feedback and an Undo.
export const useMemberActions = (memberId: ID, scope: Scope) => {
  const apply = useApp((s) => s.apply)
  const restore = useApp((s) => s.restore)
  const push = useToasts((s) => s.push)

  const run = (fn: (studio: Studio, now: number) => Studio, title: string, body: string, tone: 'success' | 'info' = 'success') => {
    const before = useApp.getState().studio
    apply(fn)
    push({ scope, tone, title, body, undo: () => restore(before) })
  }
  const name = (s: Session) => `${typeOf(s.typeId).name}, ${fmtWhen(s.start, Date.now())}`

  return {
    book: (s: Session) => run((st, now) => book(st, s.id, memberId, now), "You're booked", name(s)),
    join: (s: Session) =>
      run((st, now) => joinWaitlist(st, s.id, memberId, now), `You're ${ordinal(s.waitlist.length + 1)} on the waitlist`, name(s)),
    leave: (s: Session) => run((st) => leaveWaitlist(st, s.id, memberId), 'You left the waitlist', name(s), 'info'),
    cancel: (s: Session) => run((st, now) => cancelBooking(st, s.id, memberId, now), 'Booking cancelled', name(s), 'info'),
    favorite: (s: Session) => apply((st) => toggleFavorite(st, memberId, seriesKey(s))),
  }
}

export type MemberActions = ReturnType<typeof useMemberActions>

export function FavoriteButton({ active, onClick, className }: { active: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from my week' : 'Add to my week'}
      className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-ink/5', className)}
    >
      <Star className={cx('h-[18px] w-[18px] transition', active ? 'fill-[#F5A524] text-[#F5A524]' : 'text-ink/35')} />
    </button>
  )
}

const QUICK: Partial<Record<MemberState, { label: string; variant: 'primary' | 'outline' }>> = {
  open: { label: 'Book', variant: 'primary' },
  few: { label: 'Book', variant: 'primary' },
  full: { label: 'Waitlist', variant: 'outline' },
  claim: { label: 'Book', variant: 'primary' },
}

interface RowProps {
  session: Session
  memberId: ID
  now: number
  actions: MemberActions
  onOpen: () => void
  showDay?: boolean
  quick?: boolean
}

export function SessionRow({ session, memberId, now, actions, onOpen, showDay, quick }: RowProps) {
  const type = typeOf(session.typeId)
  const rules = useApp((s) => rulesOf(s.studio))
  const state = memberState(session, memberId, now, rules)
  const dim = state === 'ended' || state === 'cancelled'
  // A claimable spot is urgent, so it gets a button wherever the class is listed.
  const action = quick || state === 'claim' ? QUICK[state] : undefined

  return (
    <div className={cx('relative flex items-stretch overflow-hidden rounded-2xl bg-white shadow-card', dim && 'opacity-60')}>
      <span className="w-1.5 shrink-0" style={{ background: type.color }} aria-hidden />
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-2 text-left">
        <div className="w-[76px] shrink-0 whitespace-nowrap">
          {showDay && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{fmtDay(session.start, now).split(',')[0]}</p>}
          <p className="font-display text-base font-semibold leading-tight">{fmtTime(session.start)}</p>
          <p className="text-xs text-muted">{session.durationMin} min</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cx('truncate font-semibold', state === 'cancelled' && 'line-through')}>{type.name}</p>
          <p className="truncate text-[13px] text-muted">
            {instructorOf(session.instructorId).name} · {session.room}
          </p>
          <div className="mt-1.5">
            <StatePill session={session} memberId={memberId} now={now} />
          </div>
        </div>
      </button>
      <div className="flex items-center pr-3">
        {action ? (
          <Button size="sm" variant={action.variant} onClick={() => (state === 'full' ? actions.join(session) : actions.book(session))}>
            {action.label}
          </Button>
        ) : (
          <ChevronRight className="h-4 w-4 text-ink/30" aria-hidden />
        )}
      </div>
    </div>
  )
}

export function Empty({ icon: Icon, title, children }: { icon: typeof Star; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink/15 px-6 py-8 text-center">
      <Icon className="h-7 w-7 text-ink/30" />
      <p className="mt-2 font-semibold">{title}</p>
      <div className="mt-1 text-sm text-muted">{children}</div>
    </div>
  )
}
