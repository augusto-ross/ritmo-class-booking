import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Home,
  Mail,
  MapPin,
  PartyPopper,
  RefreshCw,
  Star,
  Ticket,
  UserRound,
  X,
} from 'lucide-react'
import { Avatar, Button, cx, Logo, Toaster, useNoticeToasts, useNow } from '../components/ui'
import { instructorOf, memberOf, typeOf } from '../domain/catalog'
import { dismissNotices, hasStarted, markRead, memberState, prefsOf, rulesOf, seriesKey } from '../domain/rules'
import type { ID, Notice, NoticeKind, Session } from '../domain/types'
import { DAY, fmtAgo, fmtDate, fmtDay, fmtIn, fmtTime, fmtWeekday } from '../lib/format'
import { useApp, useToasts, type MemberId } from '../store'
import { Empty, SessionRow, useMemberActions, type MemberActions } from './parts'
import { ProfileView } from './ProfileView'
import { ScheduleView } from './ScheduleView'
import { EmailSheet, SessionSheet } from './SessionSheet'

type Tab = 'home' | 'schedule' | 'bookings' | 'profile' | 'inbox'

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'bookings', label: 'Bookings', icon: Ticket },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

interface ViewProps {
  memberId: ID
  now: number
  sessions: Session[]
  actions: MemberActions
  open: (id: ID) => void
}

export function MemberApp({ memberId }: { memberId: MemberId }) {
  const studio = useApp((s) => s.studio)
  const apply = useApp((s) => s.apply)
  const now = useNow()
  const [tab, setTab] = useState<Tab>('home')
  const [openId, setOpenId] = useState<ID | null>(null)
  const [emailId, setEmailId] = useState<ID | null>(null)
  const actions = useMemberActions(memberId, memberId)
  const scroller = useRef<HTMLDivElement>(null)

  const notices = useMemo(() => studio.notices.filter((n) => n.memberId === memberId && !n.dismissed), [studio.notices, memberId])
  const unread = notices.filter((n) => !n.read).length
  useNoticeToasts(memberId, memberId, studio.notices)

  useEffect(() => {
    setTab('home')
    setOpenId(null)
    setEmailId(null)
  }, [memberId])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    if (tab !== 'inbox') return
    const t = setTimeout(() => apply((st) => markRead(st, memberId)), 2500)
    return () => clearTimeout(t)
  }, [tab, memberId, apply])

  const view: ViewProps = { memberId, now, sessions: studio.sessions, actions, open: setOpenId }
  const emailNotice = notices.find((n) => n.id === emailId)

  return (
    <div className="@container relative flex h-full flex-col overflow-hidden bg-paper">
      <Toaster scope={memberId} />
      <header className="flex items-center justify-between px-5 pb-2 pt-4">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('inbox')}
            aria-label={`Notifications, ${unread} unread`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          <button onClick={() => setTab('profile')} aria-label="Your profile" className="rounded-full">
            <Avatar name={memberOf(memberId).name} className="bg-ink text-paper" />
          </button>
        </div>
      </header>

      <div ref={scroller} className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'home' && <HomeView {...view} favorites={studio.favorites[memberId] ?? []} goSchedule={() => setTab('schedule')} />}
        {tab === 'schedule' && <ScheduleView {...view} />}
        {tab === 'bookings' && <BookingsView {...view} goSchedule={() => setTab('schedule')} />}
        {tab === 'profile' && <ProfileView memberId={memberId} />}
        {tab === 'inbox' && <InboxView memberId={memberId} notices={notices} now={now} open={setOpenId} openEmail={setEmailId} email={prefsOf(studio, memberId).email} />}
      </div>

      <nav className="grid grid-cols-4 border-t border-line bg-white/90 px-2 pb-2 pt-1.5 backdrop-blur" aria-label="Main">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={cx('relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition', tab === id ? 'text-brand' : 'text-muted hover:text-ink')}
          >
            <span className="relative">
              <Icon className="h-[22px] w-[22px]" strokeWidth={tab === id ? 2.4 : 1.9} />
            </span>
            {label}
          </button>
        ))}
      </nav>

      <SessionSheet
        session={studio.sessions.find((s) => s.id === openId)}
        studio={studio}
        memberId={memberId}
        now={now}
        actions={actions}
        onClose={() => setOpenId(null)}
      />
      <EmailSheet
        notice={emailNotice}
        session={studio.sessions.find((s) => s.id === emailNotice?.sessionId)}
        now={now}
        onClose={() => setEmailId(null)}
      />
    </div>
  )
}

const greeting = (now: number) => {
  const h = new Date(now).getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between">
      <h2 className="font-display text-xl font-bold">{children}</h2>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </div>
  )
}

function HomeView({ memberId, now, sessions, actions, open, favorites, goSchedule }: ViewProps & { favorites: string[]; goSchedule: () => void }) {
  const upcoming = sessions.filter((s) => s.status === 'scheduled' && !hasStarted(s, now))
  const next = upcoming.find((s) => s.booked.includes(memberId))
  const thisWeek = upcoming.filter((s) => s.start < now + 7 * DAY)
  // Everything the member already has this week, favourite or not: bookings and waitlist spots.
  const mine = thisWeek.filter((s) => s.id !== next?.id && (s.booked.includes(memberId) || s.waitlist.includes(memberId)))
  // Their usual classes they have not booked or joined yet: the routine, ready to book.
  const usual = thisWeek.filter((s) => favorites.includes(seriesKey(s)) && !s.booked.includes(memberId) && !s.waitlist.includes(memberId))
  const bookedCount = mine.filter((s) => s.booked.includes(memberId)).length + (next ? 1 : 0)
  const waitingCount = mine.filter((s) => s.waitlist.includes(memberId)).length
  const suggestions = upcoming.filter((s) => !s.booked.includes(memberId) && s.booked.length < s.capacity).slice(0, 3)

  return (
    <>
      <p className="mt-2 text-sm text-muted">{fmtWeekday(now)}, {fmtDate(now)}</p>
      <h1 className="font-display text-[28px] font-bold leading-tight">
        {greeting(now)}, {memberOf(memberId).name.split(' ')[0]}
      </h1>

      {next ? (
        <motion.button
          layout
          onClick={() => open(next.id)}
          className="relative mt-5 block w-full overflow-hidden rounded-3xl bg-ink p-5 text-left text-paper shadow-pop"
        >
          {/* The photo fades into the card from the right so the text keeps a solid background. */}
          <img
            src={typeOf(next.typeId).image}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-60 [mask-image:linear-gradient(to_right,transparent,black_75%)]"
          />
          <div className="relative flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-paper/60">Up next</span>
            <span className="rounded-full bg-ink/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">{fmtIn(next.start, now)}</span>
          </div>
          <p className="relative mt-4 font-display text-3xl font-bold leading-none">{typeOf(next.typeId).name}</p>
          <p className="relative mt-2 font-display text-lg font-semibold text-brand-bright">
            {fmtDay(next.start, now)} · {fmtTime(next.start)}
          </p>
          <div className="relative mt-4 flex items-center justify-between text-sm text-paper/85">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {next.room} · {instructorOf(next.instructorId).name}
            </span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </motion.button>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-ink/20 p-5">
          <p className="font-display text-lg font-bold">Nothing booked yet</p>
          <p className="mt-1 text-sm text-muted">Pick a class and your next session shows up here.</p>
          <Button size="sm" className="mt-3" onClick={goSchedule}>Browse the schedule</Button>
        </div>
      )}

      {mine.length > 0 && (
        <>
          <SectionTitle hint={[`${bookedCount} booked`, waitingCount > 0 && `${waitingCount} waiting`].filter(Boolean).join(' · ')}>This week</SectionTitle>
          <div className="space-y-2.5">
            {mine.map((s) => (
              <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} showDay />
            ))}
          </div>
        </>
      )}

      <SectionTitle hint={usual.length > 0 && 'From your favourites'}>Your usual classes</SectionTitle>
      {usual.length > 0 ? (
        <div className="space-y-2.5">
          {usual.map((s) => (
            <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} showDay quick />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-card">You're all set: every usual class this week is booked.</p>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="flex items-center gap-2 font-semibold">
            <Star className="h-4 w-4 fill-[#F5A524] text-[#F5A524]" />
            Build your routine
          </p>
          <p className="mt-1 text-sm text-muted">Star the classes you take every week. They'll show up here, ready to book in one tap.</p>
        </div>
      )}

      {favorites.length === 0 && (
        <>
          <SectionTitle>Coming up at Ritmo</SectionTitle>
          <div className="space-y-2.5">
            {suggestions.map((s) => (
              <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} showDay quick />
            ))}
          </div>
        </>
      )}

      <button onClick={goSchedule} className="mt-5 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-semibold text-brand">
        See the full schedule <ArrowRight className="h-4 w-4" />
      </button>
    </>
  )
}

function BookingsView({ memberId, now, sessions, actions, open, goSchedule }: ViewProps & { goSchedule: () => void }) {
  const future = sessions.filter((s) => !hasStarted(s, now))
  const booked = future.filter((s) => s.booked.includes(memberId))
  const rules = useApp((st) => rulesOf(st.studio))
  const claimable = future.filter((s) => memberState(s, memberId, now, rules) === 'claim')
  const waiting = future.filter((s) => s.waitlist.includes(memberId) && !claimable.includes(s))
  const history = sessions.filter((s) => hasStarted(s, now) && s.booked.includes(memberId)).reverse().slice(0, 6)

  return (
    <>
      <h1 className="mt-2 font-display text-[28px] font-bold">My bookings</h1>

      {claimable.length > 0 && (
        <>
          <SectionTitle hint="First to book gets it">A spot opened</SectionTitle>
          <div className="space-y-2.5">
            {claimable.map((s) => (
              <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} showDay />
            ))}
          </div>
        </>
      )}

      <SectionTitle hint={booked.length > 0 && `${booked.length} upcoming`}>Booked</SectionTitle>
      <div className="space-y-2.5">
        {booked.map((s) => (
          <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} showDay />
        ))}
        {booked.length === 0 && (
          <Empty icon={CalendarCheck} title="No upcoming classes">
            <Button size="sm" className="mt-2" onClick={goSchedule}>Find a class</Button>
          </Empty>
        )}
      </div>

      {waiting.length > 0 && (
        <>
          <SectionTitle>Waitlists</SectionTitle>
          <div className="space-y-2.5">
            {waiting.map((s) => (
              <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} showDay />
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <SectionTitle>Recent</SectionTitle>
          <ul className="divide-y divide-line rounded-2xl bg-white px-4 shadow-card">
            {history.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: typeOf(s.typeId).color }} />
                <span className="flex-1 font-medium">{typeOf(s.typeId).name}</span>
                <span className="text-muted">{fmtDay(s.start, now)}</span>
                <span className={cx('w-16 text-right text-xs font-semibold', s.attendance[memberId] === 'absent' ? 'text-danger' : 'text-ok')}>
                  {s.attendance[memberId] === 'absent' ? 'Missed' : 'Attended'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

const NOTICE_ICON: Record<NoticeKind, { icon: typeof Home; className: string }> = {
  booking_confirmed: { icon: CheckCircle2, className: 'bg-ok-soft text-ok' },
  promoted: { icon: PartyPopper, className: 'bg-ok-soft text-ok' },
  spot_open: { icon: BellRing, className: 'bg-brand-soft text-brand' },
  class_cancelled: { icon: CalendarX, className: 'bg-danger-soft text-danger' },
  class_changed: { icon: RefreshCw, className: 'bg-warn-soft text-warn' },
  removed: { icon: CalendarX, className: 'bg-danger-soft text-danger' },
  reminder: { icon: Bell, className: 'bg-sand text-ink' },
  favorite_open: { icon: Star, className: 'bg-warn-soft text-warn' },
}

function InboxView({ memberId, notices, now, open, openEmail, email }: { memberId: MemberId; notices: Notice[]; now: number; open: (id: ID) => void; openEmail: (id: ID) => void; email: boolean }) {
  const apply = useApp((s) => s.apply)
  const restore = useApp((s) => s.restore)
  const push = useToasts((s) => s.push)
  const clear = (ids?: ID[]) => {
    const before = useApp.getState().studio
    apply((st) => dismissNotices(st, memberId, ids))
    push({ scope: memberId, tone: 'info', title: ids ? 'Notification cleared' : 'Notifications cleared', undo: () => restore(before) })
  }
  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold">Notifications</h1>
        {notices.length > 0 && (
          <button onClick={() => clear()} className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-ink/5 hover:text-ink">
            Clear all
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{email ? 'Everything here is also sent to your email.' : 'Email updates are off. You can turn them on in your profile.'}</p>
      <div className="mt-4 space-y-2.5">
        {notices.map((n) => {
          const { icon: Icon, className } = NOTICE_ICON[n.kind]
          return (
            <motion.div layout key={n.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', className)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{n.title}</p>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                    {fmtAgo(n.at, now)}
                    {!n.read && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Unread" />}
                    <button
                      onClick={() => clear([n.id])}
                      aria-label={`Clear notification: ${n.title}`}
                      className="-mr-2 -mt-1 flex h-7 w-7 items-center justify-center rounded-full hover:bg-ink/5 hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink/75">{n.body}</p>
                <div className="mt-2 flex gap-4 text-[13px] font-semibold">
                  {n.sessionId && (
                    <button onClick={() => open(n.sessionId!)} className="text-brand hover:underline">View class</button>
                  )}
                  {email && <button onClick={() => openEmail(n.id)} className="inline-flex items-center gap-1 text-muted hover:text-ink">
                    <Mail className="h-3.5 w-3.5" /> Email preview
                  </button>}
                </div>
              </div>
            </motion.div>
          )
        })}
        {notices.length === 0 && (
          <Empty icon={Bell} title="You're all caught up">
            Booking updates and waitlist news will land here.
          </Empty>
        )}
      </div>
    </>
  )
}

