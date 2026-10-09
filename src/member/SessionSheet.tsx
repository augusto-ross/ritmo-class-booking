import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, CalendarClock, CalendarPlus, Clock, MapPin } from 'lucide-react'
import { downloadIcs } from '../lib/calendar'
import { Avatar, Button, Meter, Sheet } from '../components/ui'
import { instructorOf, memberOf, typeOf } from '../domain/catalog'
import {
  conflictFor,
  insideCutoff,
  rulesOf,
  memberState,
  seriesKey,
  waitlistPosition,
} from '../domain/rules'
import type { ID, Notice, Session, Studio } from '../domain/types'
import { fmtDay, fmtIn, fmtTime, fmtWhen } from '../lib/format'
import { FavoriteButton, StatePill, type MemberActions } from './parts'

interface Props {
  session: Session | undefined
  studio: Studio
  memberId: ID
  now: number
  actions: MemberActions
  onClose: () => void
}

export function SessionSheet({ session, studio, memberId, now, actions, onClose }: Props) {
  const [confirmLate, setConfirmLate] = useState(false)
  useEffect(() => setConfirmLate(false), [session?.id])

  return (
    <Sheet open={!!session} onClose={onClose} label="Class details">
      {session && (
        <Body
          session={session}
          studio={studio}
          memberId={memberId}
          now={now}
          actions={actions}
          onClose={onClose}
          confirmLate={confirmLate}
          setConfirmLate={setConfirmLate}
        />
      )}
    </Sheet>
  )
}

function Body({
  session,
  studio,
  memberId,
  now,
  actions,
  onClose,
  confirmLate,
  setConfirmLate,
}: Props & { session: Session; confirmLate: boolean; setConfirmLate: (v: boolean) => void }) {
  const type = typeOf(session.typeId)
  const instructor = instructorOf(session.instructorId)
  const rules = rulesOf(studio)
  const hours = rules.cutoffHours
  const late = insideCutoff(session, now, rules)
  const state = memberState(session, memberId, now, rules)
  // What a member on the waitlist can expect when a spot opens close to class.
  const lateOutcome = {
    open: "if a spot opens we'll alert everyone waiting and the first to book gets it.",
    next: "if a spot opens it still goes to the next person in line, and we'll let you know.",
    hold: 'if a spot opens the front desk decides who gets it.',
  }[rules.lateSpot]
  const favorite = (studio.favorites[memberId] ?? []).includes(seriesKey(session))
  const conflict = state === 'open' || state === 'few' || state === 'full' || state === 'claim' ? conflictFor(studio, session, memberId) : undefined
  const done = (fn: () => void) => () => {
    fn()
    onClose()
  }

  return (
    <>
      <div className="relative flex h-48 shrink-0 flex-col justify-end px-5 pb-4 text-white" style={{ background: type.color }}>
        <img src={type.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/5" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-ink">
            <span className="h-2 w-2 rounded-full" style={{ background: type.color }} />
            {fmtDay(session.start, now)}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold leading-none">{type.name}</h2>
          <p className="mt-1.5 font-display text-xl font-semibold">
            {fmtTime(session.start)}
            <span className="ml-2 text-sm font-medium text-white/75">{state !== 'ended' && state !== 'cancelled' && fmtIn(session.start, now)}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3">
          <Avatar name={instructor.name} src={instructor.photo} className="h-11 w-11 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{instructor.name}</p>
            <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{session.room}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{session.durationMin} min</span>
            </p>
          </div>
          <FavoriteButton active={favorite} onClick={() => actions.favorite(session)} className="bg-white shadow-card" />
        </div>

        <p className="text-[15px] leading-relaxed text-ink/80">{type.blurb}</p>

        {state === 'cancelled' ? (
          <Callout tone="danger" title="Cancelled by the studio">
            {session.cancelReason || 'This class will not take place.'}
          </Callout>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">
                {session.booked.length} of {session.capacity} spots taken
              </span>
              <StatePill session={session} memberId={memberId} now={now} />
            </div>
            <Meter value={session.booked.length} max={session.capacity} color={type.color} />
            {session.waitlist.length > 0 && (
              <p className="mt-2 text-[13px] text-muted">
                {session.waitlist.length} {session.waitlist.length === 1 ? 'person' : 'people'} on the waitlist
              </p>
            )}
          </div>
        )}

        {conflict && (
          <Callout tone="warn" title="You have another class at this time">
            You're already booked for {typeOf(conflict.typeId).name} at {fmtTime(conflict.start)}.
          </Callout>
        )}

        {state === 'full' && (
          <p className="text-[13px] leading-relaxed text-muted">
            {late
              ? `You'd be #${session.waitlist.length + 1} in line. Class starts soon: ${lateOutcome}`
              : `You'd be #${session.waitlist.length + 1} in line. If a spot opens up to ${hours} hours before class, we book you automatically and let you know.`}
          </p>
        )}
        {state === 'claim' && (
          <p className="rounded-2xl bg-ok-soft p-4 text-[13px] leading-relaxed text-ok">
            <span className="font-semibold">A spot just opened.</span> The first person to book gets it.
          </p>
        )}
        {state === 'waitlist' && (
          <p className="text-[13px] leading-relaxed text-muted">
            You're #{waitlistPosition(session, memberId)} in line.{' '}
            {late
              ? `Class starts soon: ${lateOutcome}`
              : `We'll book you automatically if a spot opens up to ${hours} hours before class.`}
          </p>
        )}
        {state === 'booked' && !late && (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            Free cancellation until {fmtTime(session.start - hours * 3600000)}. Your spot goes straight to the next person waiting.
          </p>
        )}
        {state === 'booked' && (
          <button
            onClick={() => downloadIcs(session)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-card transition hover:bg-sand"
          >
            <CalendarPlus className="h-5 w-5 shrink-0 text-brand" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Add to calendar</span>
              <span className="block text-[13px] text-muted">Google, Apple or Outlook</span>
            </span>
          </button>
        )}
      </div>

      <div className="border-t border-line bg-paper px-5 pb-6 pt-4">
        {confirmLate ? (
          <div>
            <p className="flex items-start gap-2 text-sm font-semibold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              This is a late cancellation
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Class starts {fmtIn(session.start, now)}, inside the {hours}-hour window. It will be recorded on your profile, and we'll
              offer your spot to the waitlist.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirmLate(false)}>Keep my spot</Button>
              <Button variant="dark" onClick={done(() => actions.cancel(session))}>Cancel anyway</Button>
            </div>
          </div>
        ) : state === 'open' || state === 'few' ? (
          <Button size="lg" className="w-full" onClick={done(() => actions.book(session))}>
            {conflict ? 'Book anyway' : 'Book this class'}
          </Button>
        ) : state === 'full' ? (
          <Button size="lg" variant="dark" className="w-full" onClick={done(() => actions.join(session))}>
            Join waitlist
          </Button>
        ) : state === 'claim' ? (
          <div className="space-y-2">
            <Button size="lg" className="w-full" onClick={done(() => actions.book(session))}>
              Book the free spot
            </Button>
            <button onClick={done(() => actions.leave(session))} className="w-full py-1 text-sm font-semibold text-muted hover:text-ink">
              Leave waitlist
            </button>
          </div>
        ) : state === 'waitlist' ? (
          <Button size="lg" variant="outline" className="w-full" onClick={done(() => actions.leave(session))}>
            Leave waitlist
          </Button>
        ) : state === 'booked' ? (
          <Button size="lg" variant="outline" className="w-full" onClick={late ? () => setConfirmLate(true) : done(() => actions.cancel(session))}>
            Cancel booking
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </>
  )
}

function Callout({ tone, title, children }: { tone: 'warn' | 'danger'; title: string; children: ReactNode }) {
  return (
    <div className={tone === 'warn' ? 'rounded-2xl bg-warn-soft p-4 text-warn' : 'rounded-2xl bg-danger-soft p-4 text-danger'}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink/75">{children}</p>
    </div>
  )
}

interface EmailProps {
  notice: Notice | undefined
  session: Session | undefined
  now: number
  onClose: () => void
}

export function EmailSheet({ notice, session, now, onClose }: EmailProps) {
  return (
    <Sheet open={!!notice} onClose={onClose} label="Email preview">
      {notice && (
        <div className="overflow-y-auto px-5 pb-6 pt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Email preview</p>
          <p className="mt-1 text-[13px] text-muted">The same update is sent to the member's inbox.</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <dl className="space-y-1 border-b border-line bg-sand/50 px-4 py-3 text-[13px]">
              <div className="flex gap-2"><dt className="w-14 text-muted">From</dt><dd className="font-medium">Ritmo &lt;hello@ritmo.studio&gt;</dd></div>
              <div className="flex gap-2"><dt className="w-14 text-muted">To</dt><dd className="truncate">{memberOf(notice.memberId).email}</dd></div>
              <div className="flex gap-2"><dt className="w-14 text-muted">Subject</dt><dd className="font-semibold">{notice.title}</dd></div>
            </dl>
            <div className="px-5 py-6">
              <p className="font-display text-xl font-bold">
                ritmo<span className="text-brand-bright">.</span>
              </p>
              <p className="mt-5 text-[15px]">Hi {memberOf(notice.memberId).name.split(' ')[0]},</p>
              <p className="mt-3 text-[15px] leading-relaxed">{notice.body}</p>
              {session && (
                <div className="mt-5 rounded-xl p-4" style={{ background: typeOf(session.typeId).tint }}>
                  <p className="font-semibold">{typeOf(session.typeId).name}</p>
                  <p className="text-sm text-ink/70">
                    {fmtWhen(session.start, now)} · {instructorOf(session.instructorId).name} · {session.room}
                  </p>
                </div>
              )}
              <span className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">Open in Ritmo</span>
              <p className="mt-6 border-t border-line pt-4 text-xs text-muted">Ritmo Studio · You get these emails for classes you book or follow.</p>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
