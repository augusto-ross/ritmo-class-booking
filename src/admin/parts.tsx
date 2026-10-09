import type { ReactNode } from 'react'
import { Flame, TrendingDown } from 'lucide-react'
import { cx, Meter } from '../components/ui'
import { instructorOf, typeOf } from '../domain/catalog'
import { hasEnded, hasStarted, uncheckedIn, type Attention } from '../domain/rules'
import type { ID, Session } from '../domain/types'
import { fmtIn, fmtTime } from '../lib/format'

// Values picked on the calendar that prefill the new-class form.
export interface Preset {
  day?: number
  time?: string
  room?: string
}

export interface ViewProps {
  sessions: Session[]
  now: number
  open: (id: ID) => void
  create: (preset?: Preset) => void
}

export function PageHead({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted">{sub}</p>
        <h1 className="font-display text-[28px] font-bold leading-tight @3xl:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  )
}

const ATTENTION = {
  demand: { label: 'High demand', icon: Flame, className: 'bg-brand-soft text-brand' },
  low: { label: 'Low bookings', icon: TrendingDown, className: 'bg-ink/8 text-ink' },
}

export function AttentionBadge({ kind }: { kind: Attention }) {
  const { label, icon: Icon, className } = ATTENTION[kind]
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold', 'px-2.5 py-1 text-xs', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function status(s: Session, now: number) {
  if (s.status === 'cancelled') return { text: 'Cancelled', className: 'text-danger' }
  if (hasEnded(s, now)) return { text: 'Ended', className: 'text-muted' }
  if (hasStarted(s, now)) return { text: 'In progress', className: 'text-ok' }
  return { text: fmtIn(s.start, now), className: 'text-muted' }
}

export function AdminRow({ session, now, onOpen }: { session: Session; now: number; onOpen: () => void }) {
  const type = typeOf(session.typeId)
  const st = status(session, now)
  const missing = uncheckedIn(session, now).length
  const off = (session.status === 'cancelled' || hasEnded(session, now)) && missing === 0
  return (
    <button
      onClick={onOpen}
      className={cx('flex w-full items-stretch overflow-hidden rounded-2xl bg-white text-left shadow-card transition hover:shadow-pop', off && 'opacity-60')}
    >
      <span className="w-1.5 shrink-0" style={{ background: type.color }} aria-hidden />
      <div className="grid min-w-0 flex-1 grid-cols-[72px_1fr] items-center gap-x-3 gap-y-2 p-3 @2xl:grid-cols-[84px_1.2fr_1fr_130px]">
        <div>
          <p className="font-display text-[17px] font-semibold leading-tight">{fmtTime(session.start)}</p>
          <p className={cx('text-xs font-medium', st.className)}>{st.text}</p>
        </div>
        <div className="min-w-0">
          <p className={cx('truncate font-semibold', session.status === 'cancelled' && 'line-through')}>{type.name}</p>
          <p className="truncate text-[13px] text-muted">
            {instructorOf(session.instructorId).name} · {session.room}
          </p>
        </div>
        <div className="col-span-2 @2xl:col-span-1">
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold">
              {session.booked.length}/{session.capacity} booked
            </span>
            {session.booked.length >= session.capacity && <span className="font-semibold" style={{ color: type.color }}>Full</span>}
          </div>
          <Meter value={session.booked.length} max={session.capacity} color={type.color} />
        </div>
        <div className="col-span-2 flex flex-wrap gap-1.5 @2xl:col-span-1 @2xl:flex-col @2xl:items-end">
          {session.waitlist.length > 0 && (
            <span className="inline-flex rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">{session.waitlist.length} waiting</span>
          )}
          {missing > 0 && (
            <span className="inline-flex whitespace-nowrap rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">{missing} to check in</span>
          )}
          {session.waitlist.length === 0 && missing === 0 && <span className="hidden text-xs text-muted @2xl:inline">No waitlist</span>}
        </div>
      </div>
    </button>
  )
}
