import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, CalendarDays, LayoutDashboard, Lightbulb, Plus, Settings2, Users, X } from 'lucide-react'
import { Avatar, Button, cx, Logo, Meter, Toaster, useNow } from '../components/ui'
import { typeOf } from '../domain/catalog'
import { attentionFor, hasEnded, hasStarted, heldSpots, rulesOf, uncheckedIn } from '../domain/rules'
import type { ID, Session } from '../domain/types'
import { addDays, DAY, fmtDate, fmtWeekdayLong, fmtWhen, sameDay, startOfDay } from '../lib/format'
import { useApp, useToasts } from '../store'
import { AdminSessionSheet, ClassFormSheet } from './AdminSheets'
import { AdminRow, AttentionBadge, PageHead, type Preset, type ViewProps } from './parts'
import { MembersView, type Segment } from './MembersView'
import { RulesView } from './RulesView'
import { ScheduleView } from './ScheduleView'

type View = 'today' | 'schedule' | 'members' | 'rules'

const VIEWS: { id: View; label: string; icon: typeof Users }[] = [
  { id: 'today', label: 'Today', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'rules', label: 'Rules', icon: Settings2 },
]

export function AdminApp() {
  const sessions = useApp((s) => s.studio.sessions)
  const now = useNow()
  const [view, setView] = useState<View>('today')
  // Where a KPI card sends you: the view plus the filter it should open with.
  const [focus, setFocus] = useState<{ waitlistOnly?: boolean; segment?: Segment; period?: '7' | '30'; at: number }>({ at: 0 })
  const goTo = (v: View, f: Omit<typeof focus, 'at'> = {}) => {
    setFocus({ ...f, at: Date.now() })
    setView(v)
  }
  const [openId, setOpenId] = useState<ID | null>(null)
  const [form, setForm] = useState<{ editId?: ID; preset?: Preset; opened: number } | null>(null)
  const studio = useApp((s) => s.studio)
  const needsAction = heldSpots(studio, now).length > 0 || sessions.some((s) => sameDay(s.start, now) && uncheckedIn(s, now).length > 0)
  const props: ViewProps = { sessions, now, open: setOpenId, create: (preset) => setForm({ preset, opened: Date.now() }) }

  return (
    <div className="@container relative h-full overflow-hidden bg-paper">
      <Toaster scope="admin" />
      <div className="flex h-full flex-col @3xl:flex-row">
        <aside className="hidden w-56 shrink-0 flex-col bg-ink p-5 text-paper @3xl:flex">
          <Logo light />
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-paper/50">Studio admin</p>
          <nav className="mt-8 space-y-1" aria-label="Admin">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => goTo(id)}
                aria-current={view === id ? 'page' : undefined}
                className={cx('flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition', view === id ? 'bg-white/12 text-paper' : 'text-paper/60 hover:bg-white/5 hover:text-paper')}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
                {id === 'today' && needsAction && <span className="ml-auto h-2 w-2 rounded-full bg-brand-bright" aria-label="Needs action" />}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2.5">
            <Avatar name="Carla Mendes" className="bg-white/15 text-paper" />
            <div className="text-sm leading-tight">
              <p className="font-semibold">Carla Mendes</p>
              <p className="text-paper/50">Front desk</p>
            </div>
          </div>
        </aside>

        <header className="flex items-center justify-between px-5 pb-1 pt-4 @3xl:hidden">
          <Logo />
          <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">Admin</span>
        </header>

        <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-5 pb-8 pt-3 @3xl:px-8 @3xl:pt-8">
          {view === 'today' && <TodayView {...props} goTo={goTo} />}
          {view === 'schedule' && <ScheduleView key={focus.at} {...props} waitlistOnly={focus.waitlistOnly} />}
          {view === 'members' && <MembersView key={focus.at} sessions={sessions} now={now} initialSegment={focus.segment} initialPeriod={focus.period} />}
          {view === 'rules' && <RulesView />}
        </main>

        <nav className="grid grid-cols-4 border-t border-line bg-white/90 px-2 pb-2 pt-1.5 @3xl:hidden" aria-label="Admin">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => goTo(id)}
              aria-current={view === id ? 'page' : undefined}
              className={cx('flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold', view === id ? 'text-brand' : 'text-muted')}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={view === id ? 2.4 : 1.9} />
                {id === 'today' && needsAction && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" aria-label="Needs action" />}
              </span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <AdminSessionSheet
        session={sessions.find((s) => s.id === openId)}
        now={now}
        onClose={() => setOpenId(null)}
        onEdit={(id) => {
          setOpenId(null)
          setForm({ editId: id, opened: Date.now() })
        }}
      />
      <ClassFormSheet open={!!form} editing={sessions.find((s) => s.id === form?.editId)} preset={form?.preset} instance={form?.opened} now={now} onClose={() => setForm(null)} />
    </div>
  )
}

function Stat({ label, value, note, tone, onClick, action }: { label: string; value: ReactNode; note: string; tone?: 'warn'; onClick?: () => void; action?: string }) {
  const body = (
    <>
      <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {onClick && <ArrowUpRight className="h-4 w-4 text-ink/30 transition group-hover:text-brand" />}
      </p>
      <p className={cx('mt-1 font-display text-3xl font-bold', tone === 'warn' && 'text-brand')}>{value}</p>
      <p className="text-[13px] text-muted">{note}</p>
    </>
  )
  return onClick ? (
    <button onClick={onClick} aria-label={`${label}: ${action}`} className="group flex flex-col rounded-2xl bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      {body}
    </button>
  ) : (
    <div className="rounded-2xl bg-white p-4 shadow-card">{body}</div>
  )
}

function TodayView({ sessions, now, open, create, goTo }: ViewProps & { goTo: (v: View, f?: { waitlistOnly?: boolean; segment?: Segment; period?: '7' | '30' }) => void }) {
  // What is still to come matters most at the front desk, so finished classes go last.
  const today = sessions.filter((s) => sameDay(s.start, now))
  // The front desk cares about what is still to come. Finished classes that still need
  // check-in stay on top because they need action; the rest fold away.
  const needsCheckIn = today.filter((s) => uncheckedIn(s, now).length > 0)
  const ahead = today.filter((s) => !hasEnded(s, now))
  const earlier = today.filter((s) => hasEnded(s, now) && uncheckedIn(s, now).length === 0)
  const [showEarlier, setShowEarlier] = useState(false)
  const studio = useApp((st) => st.studio)
  const held = heldSpots(studio, now)
  const tomorrow = sessions.filter((s) => sameDay(s.start, addDays(now, 1)))
  const dismissed = useApp((s) => s.dismissed)
  const setDismissed = useApp((s) => s.setDismissed)
  const push = useToasts((s) => s.push)
  const pending = sessions
    .filter((s) => s.start < now + 2 * DAY)
    .flatMap((s) => {
      const flag = attentionFor(s, now)
      return flag && !dismissed.includes(`${s.id}:${flag}`) ? [{ s, flag, key: `${s.id}:${flag}` }] : []
    })
  const suggestions = pending.slice(0, 2)
  const dismissAll = () => {
    setDismissed([...dismissed, ...pending.map((p) => p.key)])
    push({ scope: 'admin', tone: 'info', title: 'Suggestions cleared', undo: () => setDismissed(dismissed) })
  }
  const dismiss = (key: string) => {
    setDismissed([...dismissed, key])
    push({ scope: 'admin', tone: 'info', title: 'Suggestion dismissed', undo: () => setDismissed(dismissed) })
  }
  const live = today.filter((s) => s.status === 'scheduled')
  const booked = live.reduce((n, s) => n + s.booked.length, 0)
  const capacity = live.reduce((n, s) => n + s.capacity, 0)
  const waiting = [...today, ...tomorrow].filter((s) => !hasStarted(s, now)).reduce((n, s) => n + s.waitlist.length, 0)
  const cutoffHours = useApp((st) => rulesOf(st.studio).cutoffHours)
  const week = sessions.filter((s) => s.start > now - 7 * DAY && s.start <= now + cutoffHours * 3600000)
  const late = week.reduce((n, s) => n + s.lateCancels.length, 0)
  const noShows = week.reduce((n, s) => n + Object.values(s.attendance).filter((a) => a === 'absent').length, 0)

  return (
    <>
      <PageHead title="Today" sub={`${fmtWeekdayLong(now)}, ${fmtDate(now)}`}>
        <Button onClick={() => create({ day: startOfDay(now) })}><Plus className="h-4 w-4" /> New class</Button>
      </PageHead>
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Stat label="Classes today" value={live.length} note={`${live.filter((s) => !hasStarted(s, now)).length} still to come`} onClick={() => goTo('schedule')} action="open the schedule" />
        <Stat label="Spots filled" value={capacity ? `${Math.round((booked / capacity) * 100)}%` : '0%'} note={`${booked} of ${capacity} today`} />
        <Stat label="On waitlists" value={waiting} note="Today and tomorrow" onClick={() => goTo('schedule', { waitlistOnly: true })} action="see classes with a waitlist" />
        <Stat label="Late cancels" value={late} note={`${noShows} no-shows · last 7 days`} tone="warn" onClick={() => goTo('members', { segment: 'attention', period: '7' })} action="see members who need attention" />
      </div>

      {suggestions.length > 0 && (
        <section className="mt-7">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
              <Lightbulb className="h-4 w-4" /> Suggestions
              {pending.length > suggestions.length && <span className="font-medium normal-case tracking-normal">· {pending.length - suggestions.length} more</span>}
            </h2>
            <button onClick={dismissAll} className="rounded-full px-2 py-1 text-[13px] font-semibold text-muted hover:bg-ink/5 hover:text-ink">
              Clear all
            </button>
          </div>
          <div className="grid gap-2.5 @3xl:grid-cols-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {suggestions.map(({ s, flag, key }) => (
                <motion.div
                  key={key}
                  layout
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-white/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <AttentionBadge kind={flag} />
                      <p className="mt-2 font-semibold">
                        {typeOf(s.typeId).name} <span className="font-normal text-muted">· {fmtWhen(s.start, now)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(key)}
                      aria-label={`Dismiss suggestion for ${typeOf(s.typeId).name}`}
                      title="Dismiss"
                      className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1"><Meter value={s.booked.length} max={s.capacity} color={typeOf(s.typeId).color} /></div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {s.booked.length}/{s.capacity}
                      {s.waitlist.length > 0 && <span className="font-normal text-muted"> · {s.waitlist.length} waiting</span>}
                    </span>
                  </div>
                  <p className="flex-1 text-sm text-ink/80">
                    {flag === 'demand'
                      ? 'More people want in than fit. You could add a second class.'
                      : 'Starts within a day with under 40% of spots booked.'}
                  </p>
                  <div className="-ml-2 flex flex-wrap gap-1">
                    {flag === 'demand' && (
                      <Button size="sm" variant="ghost" className="px-2 text-brand" onClick={() => create({ day: startOfDay(s.start) })}>
                        <Plus className="h-4 w-4" /> Add a class that day
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => open(s.id)}>
                      {flag === 'demand' ? 'See waitlist' : 'Review class'}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="mb-3 font-display text-xl font-bold">Today</h2>
        {held.length > 0 && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ok">
              {held.length} {held.length === 1 ? 'spot' : 'spots'} to give
            </p>
            <div className="mb-5 space-y-2.5">
              {held.map((s) => (
                <button
                  key={s.id}
                  onClick={() => open(s.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-ok/30 bg-ok-soft/60 p-3 text-left transition hover:bg-ok-soft"
                >
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: typeOf(s.typeId).color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {typeOf(s.typeId).name} <span className="font-normal text-muted">· {fmtWhen(s.start, now)}</span>
                    </span>
                    <span className="block text-[13px] text-ink/70">
                      {s.capacity - s.booked.length} free · {s.waitlist.length} waiting · nobody has been told
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper">Give spot</span>
                </button>
              ))}
            </div>
          </>
        )}
        {needsCheckIn.length > 0 && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-warn">
              {needsCheckIn.length} {needsCheckIn.length === 1 ? 'class needs' : 'classes need'} check-in
            </p>
            <div className="mb-5 space-y-2.5">
              {needsCheckIn.map((s) => <AdminRow key={s.id} session={s} now={now} onOpen={() => open(s.id)} />)}
            </div>
            {ahead.length > 0 && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Coming up</p>}
          </>
        )}
        <div className="space-y-2.5">
          {ahead.map((s) => <AdminRow key={s.id} session={s} now={now} onOpen={() => open(s.id)} />)}
          {ahead.length === 0 && needsCheckIn.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-muted">No more classes today.</p>
          )}
        </div>
        {earlier.length > 0 && (
          <>
            <button onClick={() => setShowEarlier(!showEarlier)} className="mt-3 text-[13px] font-semibold text-muted hover:text-ink">
              {showEarlier ? 'Hide' : 'Show'} {earlier.length} earlier {earlier.length === 1 ? 'class' : 'classes'}
            </button>
            {showEarlier && (
              <div className="mt-2.5 space-y-2.5">
                {earlier.map((s) => <AdminRow key={s.id} session={s} now={now} onOpen={() => open(s.id)} />)}
              </div>
            )}
          </>
        )}
      </section>
      <DayList title="Tomorrow" list={tomorrow} now={now} open={open} />
    </>
  )
}

function DayList({ title, list, now, open }: { title: string; list: Session[]; now: number; open: (id: ID) => void }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
      <div className="space-y-2.5">
        {list.map((s) => (
          <AdminRow key={s.id} session={s} now={now} onOpen={() => open(s.id)} />
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-muted">No classes scheduled.</p>}
      </div>
    </section>
  )
}
