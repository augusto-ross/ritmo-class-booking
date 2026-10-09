import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, Eye, Plus, SlidersHorizontal } from 'lucide-react'
import { Avatar, Button, Chip, cx, Meter, Segmented, Select, Sheet, Tag } from '../components/ui'
import { CLASS_TYPES, INSTRUCTORS, instructorOf, ROOMS, typeOf } from '../domain/catalog'
import { endOf, hasEnded } from '../domain/rules'
import type { Session } from '../domain/types'
import { addDays, fmtDate, fmtTime, fmtWeekday, fmtWeekdayLong, sameDay, startOfDay } from '../lib/format'
import { useApp, type CalendarShow } from '../store'
import { AdminRow, PageHead, type Preset, type ViewProps } from './parts'

type Mode = 'week' | 'month' | 'rooms'

const MODES: { value: Mode; label: string }[] = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: 'Month' },
  { value: 'rooms', label: 'Rooms' },
]

const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric' })
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthStart = (ms: number, shift = 0) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth() + shift, 1).getTime()
}

const TYPE_OPTIONS = [{ value: '', label: 'All classes' }, ...CLASS_TYPES.map((t) => ({ value: t.id, label: t.name, color: t.color }))]
const INSTRUCTOR_OPTIONS = [{ value: '', label: 'All instructors' }, ...INSTRUCTORS.map((i) => ({ value: i.id, label: i.name }))]
const ROOM_OPTIONS = [{ value: '', label: 'All rooms' }, ...ROOMS.map((r) => ({ value: r, label: r }))]
const SHOW_OPTIONS: { key: keyof CalendarShow; label: string }[] = [
  { key: 'instructor', label: 'Instructor' },
  { key: 'room', label: 'Room' },
  { key: 'bookings', label: 'Bookings and waitlist' },
]

export function ScheduleView({ sessions, now, open, create, waitlistOnly: initialWaitlist = false }: ViewProps & { waitlistOnly?: boolean }) {
  const today = startOfDay(now)
  const show = useApp((s) => s.calendarShow)
  const setShow = useApp((s) => s.setCalendarShow)
  const [mode, setMode] = useState<Mode>('week')
  // Week view shows 7 days from the anchor, month view the anchor's calendar month,
  // rooms view the selected day.
  const [anchor, setAnchor] = useState(today)
  const [day, setDay] = useState(today)
  const [typeId, setTypeId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [room, setRoom] = useState('')
  const [waitlistOnly, setWaitlistOnly] = useState(initialWaitlist)
  // On phones the rooms view shows one room at a time.
  const [phoneRoom, setPhoneRoom] = useState(ROOMS[0])
  const [filtering, setFiltering] = useState(false)

  const match = (s: Session) =>
    (!typeId || s.typeId === typeId) && (!instructorId || s.instructorId === instructorId) && (!room || s.room === room) && (!waitlistOnly || s.waitlist.length > 0)
  const on = (d: number) => sessions.filter((s) => sameDay(s.start, d) && match(s))

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor])
  const month = monthStart(anchor)
  const monthDays = useMemo(() => {
    const count = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate()
    return Array.from({ length: count }, (_, i) => addDays(month, i))
  }, [month])
  const monthOptions = useMemo(
    () => [-1, 0, 1, 2, 3].map((n) => monthStart(today, n)).map((m) => ({ value: String(m), label: monthFmt.format(m) })),
    [today],
  )

  const go = (d: number) => {
    setAnchor(d)
    setDay(d)
  }
  const roomWeek = mode === 'rooms' && !!room
  const step = (dir: 1 | -1) => go(mode === 'week' || roomWeek ? addDays(anchor, dir * 7) : mode === 'month' ? monthStart(anchor, dir) : addDays(day, dir))
  const switchMode = (m: Mode) => {
    setMode(m)
    // Keep the day that was picked in the previous view.
    if (m !== 'month') setAnchor(day)
  }
  const pickMonth = (m: number) => go(sameDay(monthStart(today), m) ? today : m)
  const clear = () => {
    setTypeId('')
    setInstructorId('')
    setRoom('')
    setWaitlistOnly(false)
  }

  const inView = mode === 'week' || roomWeek ? days : mode === 'month' ? monthDays : [day]
  const activeDay = inView.find((d) => d === day) ?? inView[0]
  const weekLabel = `${fmtDate(days[0])} – ${new Date(days[6]).getMonth() === new Date(days[0]).getMonth() ? new Date(days[6]).getDate() : fmtDate(days[6])}`
  const dayLabel = `${fmtWeekday(day)}, ${fmtDate(day)}`
  const range = roomWeek
    ? `${room} · ${fmtDate(days[0])} to ${fmtDate(days[6])}`
    : mode === 'week' ? `${fmtDate(days[0])} to ${fmtDate(days[6])}` : mode === 'month' ? monthFmt.format(month) : `${fmtWeekdayLong(day)}, ${fmtDate(day)}`
  const unit = mode === 'week' || roomWeek ? '7 days' : mode === 'month' ? 'month' : 'day'
  const active = (typeId ? 1 : 0) + (instructorId ? 1 : 0) + (room ? 1 : 0) + (waitlistOnly ? 1 : 0)
  const atToday = mode === 'week' || roomWeek ? anchor === today : mode === 'month' ? sameDay(month, monthStart(today)) && day === today : day === today
  const navBtn = 'flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand'

  const viewToggle = <Segmented label="Calendar view" value={mode} onChange={switchMode} options={MODES} />
  const prev = (
    <button aria-label={`Previous ${unit}`} onClick={() => step(-1)} className={navBtn}>
      <ChevronLeft className="h-4 w-4" />
    </button>
  )
  const next = (
    <button aria-label={`Next ${unit}`} onClick={() => step(1)} className={navBtn}>
      <ChevronRight className="h-4 w-4" />
    </button>
  )
  const monthPicker = <MonthPicker value={String(month)} options={monthOptions} onChange={(v) => pickMonth(Number(v))} />
  const todayBtn = (
    <button
      onClick={() => go(today)}
      disabled={atToday}
      className="h-10 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft disabled:text-muted disabled:opacity-50 disabled:hover:bg-transparent"
    >
      Today
    </button>
  )
  // On narrow screens the period controls live inside the calendar card instead of the toolbar.
  const cardHead: ReactNode = (
    <div className="mb-1 flex items-center justify-between pl-2 @3xl:hidden">
      {mode === 'month' ? monthPicker : <p className="font-display text-base font-bold">{mode === 'week' || roomWeek ? weekLabel : dayLabel}</p>}
      <div className="flex items-center">
        {todayBtn}
        {prev}
        {next}
      </div>
    </div>
  )

  return (
    <>
      <PageHead title="Schedule" sub={range}>
        <Button onClick={() => create(day >= today ? { day } : undefined)}><Plus className="h-4 w-4" /> New class</Button>
      </PageHead>

      <div className="mb-5 hidden flex-wrap items-center gap-2 @3xl:flex">
        {viewToggle}
        <div className="flex h-10 items-center rounded-full bg-white shadow-card">
          {prev}
          {mode === 'month' ? monthPicker : <span className="min-w-[104px] px-1 text-center text-sm font-semibold">{mode === 'week' || roomWeek ? weekLabel : dayLabel}</span>}
          {next}
        </div>
        {todayBtn}
        <span className="flex-1" />
        <Select label="Filter by class" filter value={typeId} onChange={setTypeId} options={TYPE_OPTIONS} />
        <Select label="Filter by instructor" filter value={instructorId} onChange={setInstructorId} options={INSTRUCTOR_OPTIONS} />
        <Select label="Filter by room" filter value={room} onChange={setRoom} options={ROOM_OPTIONS} align="right" />
        {active > 0 && (
          <button onClick={clear} className="h-10 rounded-full px-3 text-sm font-semibold text-muted hover:bg-ink/5 hover:text-ink">
            Clear filters
          </button>
        )}
        {mode !== 'month' && <DisplayMenu show={show} onChange={setShow} />}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 @3xl:hidden">
        {viewToggle}
        <button
          onClick={() => setFiltering(true)}
          aria-label={`Filters and display, ${active} active`}
          className={cx('inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition', active ? 'bg-ink text-paper' : 'bg-white text-ink shadow-card')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden @sm:inline">Filters</span>
          {active > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-bright px-1 text-xs font-bold text-ink">{active}</span>}
        </button>
      </div>
      {active > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 @3xl:hidden">
          {typeId && <Tag label={typeOf(typeId).name} color={typeOf(typeId).color} onRemove={() => setTypeId('')} />}
          {instructorId && <Tag label={instructorOf(instructorId).name} onRemove={() => setInstructorId('')} />}
          {room && <Tag label={room} onRemove={() => setRoom('')} />}
          {waitlistOnly && <Tag label="Has a waitlist" onRemove={() => setWaitlistOnly(false)} />}
        </div>
      )}
      {waitlistOnly && (
        <div className="-mt-2 mb-4 hidden @3xl:flex">
          <Tag label="Showing classes with a waitlist" onRemove={() => setWaitlistOnly(false)} />
        </div>
      )}

      {mode === 'week' && (
        <>
          <div className="hidden grid-cols-7 gap-2 @4xl:grid">
            {days.map((d) => (
              <div key={d} className="group min-w-0">
                <div className={cx('relative mb-2 rounded-xl px-2 py-1.5 text-center', d === today ? 'bg-ink text-paper' : 'bg-sand')}>
                  <p className="text-[11px] font-semibold uppercase opacity-70">{d === today ? 'Today' : fmtWeekday(d)}</p>
                  <p className="font-display text-lg font-bold leading-tight">{new Date(d).getDate()}</p>
                  {d >= today && (
                    <button
                      onClick={() => create({ day: d })}
                      aria-label={`Add a class on ${fmtWeekdayLong(d)}, ${fmtDate(d)}`}
                      title="Add a class"
                      className={cx(
                        'absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100',
                        d === today ? 'bg-white/15 hover:bg-white/30' : 'bg-white hover:bg-ink hover:text-paper',
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {on(d).map((s) => (
                    <ClassBlock key={s.id} session={s} now={now} show={show} onOpen={() => open(s.id)} className="block w-full" />
                  ))}
                  {on(d).length === 0 && <p className="py-3 text-center text-xs text-muted">No classes</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="@4xl:hidden">
            <div className="rounded-3xl bg-white p-2 shadow-card">
              {cardHead}
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    aria-pressed={d === activeDay}
                    className={cx('flex h-[58px] flex-col items-center justify-center rounded-2xl transition', d === activeDay ? 'bg-ink text-paper' : 'hover:bg-sand')}
                  >
                    <span className={cx('text-[11px] font-semibold uppercase', d === activeDay ? 'opacity-70' : d === today ? 'text-brand' : 'text-muted')}>
                      {d === today ? 'Today' : fmtWeekday(d)}
                    </span>
                    <span className="font-display text-lg font-bold leading-tight">{new Date(d).getDate()}</span>
                  </button>
                ))}
              </div>
            </div>
            <DayClasses day={activeDay} list={on(activeDay)} now={now} open={open} onAdd={activeDay >= today ? () => create({ day: activeDay }) : undefined} />
          </div>
        </>
      )}

      {mode === 'month' && (
        <>
          <div className="rounded-3xl bg-white p-2 shadow-card @3xl:p-3">
            {cardHead}
            <div className="mb-1 grid grid-cols-7 gap-1 @3xl:gap-2">
              {WEEKDAYS.map((w) => (
                <p key={w} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted">{w}</p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 @3xl:gap-2">
              {Array.from({ length: new Date(month).getDay() }, (_, i) => <span key={`pad${i}`} />)}
              {monthDays.map((d) => {
                const list = on(d).filter((s) => s.status === 'scheduled')
                const booked = list.reduce((n, s) => n + s.booked.length, 0)
                const capacity = list.reduce((n, s) => n + s.capacity, 0)
                const waiting = list.reduce((n, s) => n + s.waitlist.length, 0)
                const picked = d === activeDay
                return (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    aria-pressed={picked}
                    aria-label={`${fmtWeekdayLong(d)}, ${fmtDate(d)}: ${list.length} classes`}
                    className={cx(
                      'flex h-12 flex-col items-center justify-center rounded-xl border text-left transition @3xl:h-[92px] @3xl:items-stretch @3xl:justify-start @3xl:p-2',
                      picked ? 'border-ink bg-sand/60' : 'border-transparent bg-paper hover:border-ink/25',
                      d < today && 'opacity-55',
                    )}
                  >
                    <span className={cx('flex h-6 w-6 items-center justify-center rounded-full font-display text-sm font-bold', d === today && 'bg-brand text-white')}>
                      {new Date(d).getDate()}
                    </span>
                    {list.length > 0 ? (
                      <>
                        <span className="mt-0.5 h-1 w-1 rounded-full bg-ink/40 @3xl:hidden" />
                        <span className="mt-1 hidden text-xs font-semibold @3xl:block">
                          {list.length} {list.length === 1 ? 'class' : 'classes'}
                        </span>
                        <span className="mt-1.5 hidden @3xl:block">
                          <Meter value={booked} max={capacity} color="var(--color-ink)" />
                        </span>
                        <span className="mt-1 hidden justify-between text-[11px] text-muted @3xl:flex">
                          <span>{Math.round((booked / capacity) * 100)}% full</span>
                          {waiting > 0 && <span className="font-bold text-warn">+{waiting}</span>}
                        </span>
                      </>
                    ) : (
                      <span className="mt-1 hidden text-xs text-muted @3xl:block">No classes</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <DayClasses day={activeDay} list={on(activeDay)} now={now} open={open} onAdd={activeDay >= today ? () => create({ day: activeDay }) : undefined} titled />
        </>
      )}

      {mode === 'rooms' && (
        <div className="rounded-3xl bg-white p-2 shadow-card @3xl:p-3">
          {cardHead}
          {roomWeek ? (
            <>
              <div className="hidden @3xl:block">
                <RoomsGrid columns={days.map((d) => ({ key: String(d), day: d, room, title: d === today ? 'Today' : fmtWeekday(d), sub: fmtDate(d), today: d === today }))} list={sessions.filter(match)} now={now} show={show} open={open} create={create} />
              </div>
              <div className="@3xl:hidden">
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDay(d)}
                      aria-pressed={d === activeDay}
                      className={cx('flex h-[54px] flex-col items-center justify-center rounded-2xl transition', d === activeDay ? 'bg-ink text-paper' : 'hover:bg-sand')}
                    >
                      <span className={cx('text-[11px] font-semibold uppercase', d === activeDay ? 'opacity-70' : d === today ? 'text-brand' : 'text-muted')}>{d === today ? 'Today' : fmtWeekday(d)}</span>
                      <span className="font-display text-base font-bold leading-tight">{new Date(d).getDate()}</span>
                    </button>
                  ))}
                </div>
                <RoomsGrid columns={[{ key: room, day: activeDay, room, title: room }]} list={sessions.filter(match)} now={now} show={show} open={open} create={create} />
              </div>
            </>
          ) : (
            <>
              <div className="hidden @3xl:block">
                <RoomsGrid columns={ROOMS.map((r) => ({ key: r, day, room: r, title: r, pick: () => setRoom(r) }))} list={sessions.filter(match)} now={now} show={show} open={open} create={create} />
              </div>
              <div className="@3xl:hidden">
                <div className="no-scrollbar -mx-2 mb-2 flex gap-1.5 overflow-x-auto px-2 pt-1" role="group" aria-label="Room">
                  {ROOMS.map((r) => {
                    const count = on(day).filter((s) => s.room === r && s.status === 'scheduled').length
                    return (
                      <button
                        key={r}
                        onClick={() => setPhoneRoom(r)}
                        aria-pressed={phoneRoom === r}
                        className={cx('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition', phoneRoom === r ? 'bg-ink text-paper' : 'bg-sand text-ink')}
                      >
                        {r}
                        <span className={cx('text-xs', phoneRoom === r ? 'text-paper/60' : 'text-muted')}>{count}</span>
                      </button>
                    )
                  })}
                </div>
                <RoomsGrid columns={[{ key: phoneRoom, day, room: phoneRoom, title: phoneRoom }]} list={sessions.filter(match)} now={now} show={show} open={open} create={create} />
              </div>
            </>
          )}
        </div>
      )}

      <Sheet open={filtering} onClose={() => setFiltering(false)} label="Filters">
        <div className="overflow-y-auto px-5 pb-2 pt-6">
          <h2 className="font-display text-2xl font-bold">Filters</h2>
          <FilterGroup title="Class">
            {CLASS_TYPES.map((t) => (
              <Chip key={t.id} active={typeId === t.id} color={t.color} onClick={() => setTypeId(typeId === t.id ? '' : t.id)}>{t.name}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup title="Instructor">
            {INSTRUCTORS.map((i) => (
              <Chip key={i.id} active={instructorId === i.id} lead={<Avatar name={i.name} src={i.photo} className="h-7 w-7 text-[10px]" />} onClick={() => setInstructorId(instructorId === i.id ? '' : i.id)}>{i.name}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup title="Waitlist">
            <Chip active={waitlistOnly} onClick={() => setWaitlistOnly(!waitlistOnly)}>Has a waitlist</Chip>
          </FilterGroup>
          <FilterGroup title="Room">
            {ROOMS.map((r) => (
              <Chip key={r} active={room === r} onClick={() => setRoom(room === r ? '' : r)}>{r}</Chip>
            ))}
          </FilterGroup>
          {mode === 'rooms' && (
            <FilterGroup title="Show on each class">
              {SHOW_OPTIONS.filter((o) => o.key !== 'room').map((o) => (
                <Chip key={o.key} active={show[o.key]} onClick={() => setShow({ ...show, [o.key]: !show[o.key] })}>{o.label}</Chip>
              ))}
            </FilterGroup>
          )}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2 px-5 pb-6 pt-5">
          <Button variant="outline" disabled={!active} onClick={clear}>Clear</Button>
          <Button variant="dark" onClick={() => setFiltering(false)}>Done</Button>
        </div>
      </Sheet>
    </>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </>
  )
}

function DisplayMenu({ show, onChange }: { show: CalendarShow; onChange: (show: CalendarShow) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Choose what each class shows"
        title="Choose what each class shows"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card hover:bg-sand"
      >
        <Eye className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-2xl bg-white p-1.5 shadow-pop">
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted">Show on each class</p>
          {SHOW_OPTIONS.map((o) => (
            <button
              key={o.key}
              role="menuitemcheckbox"
              aria-checked={show[o.key]}
              onClick={() => onChange({ ...show, [o.key]: !show[o.key] })}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium hover:bg-sand"
            >
              <span className={cx('flex h-5 w-5 items-center justify-center rounded-md border', show[o.key] ? 'border-ink bg-ink text-paper' : 'border-ink/30')}>
                {show[o.key] && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              {o.label}
            </button>
          ))}
          <p className="px-3 pb-2 pt-1 text-xs text-muted">Time and class name are always shown.</p>
        </div>
      )}
    </div>
  )
}

interface BlockProps {
  session: Session
  now: number
  show: CalendarShow
  onOpen: () => void
  // Single-line layout for the time grid, where a short class leaves little height.
  compact?: boolean
  className?: string
  style?: CSSProperties
}

function ClassBlock({ session: s, now, show, onOpen, compact, className, style }: BlockProps) {
  const type = typeOf(s.typeId)
  const off = s.status === 'cancelled' || hasEnded(s, now)
  if (compact) {
    return (
      <button
        onClick={onOpen}
        className={cx('overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left transition hover:brightness-95', off && 'opacity-50', className)}
        style={{ background: type.tint, borderColor: type.color, ...style }}
      >
        <p className="truncate text-[13px] font-semibold leading-tight">
          <span className="text-[11px] font-bold" style={{ color: type.color }}>{fmtTime(s.start)}</span>{' '}
          <span className={cx(s.status === 'cancelled' && 'line-through')}>{type.name}</span>
        </p>
        <p className="truncate text-[11px] leading-tight text-ink/70">
          {s.status === 'cancelled' ? 'Cancelled' : (
            <>
              {show.instructor && instructorOf(s.instructorId).name}
              {show.instructor && show.bookings && ' · '}
              {show.bookings && `${s.booked.length}/${s.capacity}`}
              {show.bookings && s.waitlist.length > 0 && <span className="font-bold text-warn"> +{s.waitlist.length}</span>}
            </>
          )}
        </p>
      </button>
    )
  }
  return (
    <button
      onClick={onOpen}
      className={cx('overflow-hidden rounded-xl border-l-4 px-2 py-1.5 text-left transition hover:brightness-95', off && 'opacity-50', className)}
      style={{ background: type.tint, borderColor: type.color, ...style }}
    >
      <p className="flex items-baseline justify-between gap-1.5 text-[11px]">
        <span className="shrink-0 font-bold" style={{ color: type.color }}>{fmtTime(s.start)}</span>
        {show.room && <span className="truncate font-medium text-ink/60">{s.room}</span>}
      </p>
      <p className={cx('truncate text-[13px] font-semibold leading-tight', s.status === 'cancelled' && 'line-through')}>{type.name}</p>
      {show.instructor && <p className="truncate text-[11px] text-ink/70">{instructorOf(s.instructorId).name}</p>}
      {s.status === 'cancelled' ? (
        <p className="mt-0.5 text-[11px] font-medium text-ink/70">Cancelled</p>
      ) : (
        show.bookings && (
          <p className="mt-0.5 text-[11px] font-medium text-ink/70">
            {s.booked.length}/{s.capacity}
            {s.waitlist.length > 0 && <span className="font-bold text-warn"> +{s.waitlist.length}</span>}
          </p>
        )
      )}
    </button>
  )
}

const FIRST_HOUR = 6
const LAST_HOUR = 22
const HOUR_PX = 80
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i)

interface RoomColumn {
  key: string
  day: number
  room: string
  title: string
  sub?: string
  today?: boolean
  // Lets a room header switch the view to that room's week.
  pick?: () => void
}

interface RoomsProps {
  columns: RoomColumn[]
  list: Session[]
  now: number
  show: CalendarShow
  open: (id: string) => void
  create: (preset?: Preset) => void
}

// A time grid where each column is one room on one day: all rooms on a day, or one room across a week.
// Free hours are visible as empty space, and clicking one starts a class there.
function RoomsGrid({ columns, list, now, show, open, create }: RoomsProps) {
  const cols = { gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))` }
  const y = (day: number, ms: number) => ((ms - day) / 3600000 - FIRST_HOUR) * HOUR_PX
  const inColumn = (c: RoomColumn) => list.filter((s) => s.room === c.room && sameDay(s.start, c.day))
  const today = columns.find((c) => sameDay(c.day, now))
  const nowY = today ? y(today.day, now) : -1

  return (
    <div className="overflow-x-auto @3xl:overflow-visible">
      <div style={{ minWidth: columns.length > 1 ? 600 : undefined }}>
        <div className="grid bg-white @3xl:sticky @3xl:top-0 @3xl:z-20 @3xl:pt-2" style={cols}>
          <span />
          {columns.map((c) => {
            const count = inColumn(c).filter((s) => s.status === 'scheduled').length
            const summary = count === 0 ? 'Free all day' : `${count} ${count === 1 ? 'class' : 'classes'}`
            const body = (
              <>
                <p className={cx('font-display text-sm font-bold', c.today && 'text-brand')}>
                  {c.title}
                  {c.sub && <span className="ml-1 font-sans text-xs font-medium text-muted">{c.sub}</span>}
                </p>
                <p className="text-[11px] text-muted">{summary}</p>
              </>
            )
            return c.pick ? (
              <button key={c.key} onClick={c.pick} title={`See ${c.room} for the whole week`} className="mx-1 mb-2 rounded-xl px-1 py-1 text-center transition hover:bg-sand">
                {body}
              </button>
            ) : (
              <div key={c.key} className="px-1 pb-2 text-center">{body}</div>
            )
          })}
        </div>
        <div className="relative grid" style={{ ...cols, height: HOURS.length * HOUR_PX }}>
          <div className="relative">
            {HOURS.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-muted" style={{ top: i * HOUR_PX }}>
                {i > 0 && hourFmt.format(new Date(columns[0].day).setHours(h))}
              </span>
            ))}
          </div>
          {columns.map((c) => (
            <div key={c.key} className={cx('relative border-l border-line', c.today && columns.length > 1 && 'bg-brand-soft/20')}>
              {HOURS.map((h, i) => {
                const start = new Date(c.day).setHours(h, 0, 0, 0)
                const time = `${String(h).padStart(2, '0')}:00`
                return start > now ? (
                  <button
                    key={h}
                    onClick={() => create({ day: startOfDay(c.day), time, room: c.room })}
                    aria-label={`Add a class in ${c.room} on ${fmtWeekday(c.day)} at ${fmtTime(start)}`}
                    className="group absolute inset-x-0 flex items-center justify-center border-t border-line/70 text-xs font-semibold text-transparent transition hover:bg-sand hover:text-ink focus-visible:text-ink"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> {fmtTime(start)}
                  </button>
                ) : (
                  <span key={h} className="absolute inset-x-0 border-t border-line/70 bg-paper/60" style={{ top: i * HOUR_PX, height: HOUR_PX }} />
                )
              })}
              {inColumn(c).map((s) => (
                <ClassBlock
                  key={s.id}
                  session={s}
                  now={now}
                  show={show}
                  compact
                  onOpen={() => open(s.id)}
                  className="absolute inset-x-1 z-10 shadow-card"
                  style={{ top: y(c.day, s.start) + 1, height: Math.max(26, y(c.day, endOf(s)) - y(c.day, s.start) - 2) }}
                />
              ))}
              {sameDay(c.day, now) && nowY > 0 && nowY < HOURS.length * HOUR_PX && (
                <div className="pointer-events-none absolute -left-1 right-0 z-20 flex items-center" style={{ top: nowY }} aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  <span className="h-px flex-1 bg-brand" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonthPicker({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  // The month a user stepped to with the arrows may be outside the quick list.
  const list = options.some((o) => o.value === value) ? options : [...options, { value, label: monthFmt.format(Number(value)) }]
  return (
    <Select label="Choose month" value={value} onChange={onChange} options={list} className="bg-transparent px-2 shadow-none hover:bg-sand" />
  )
}

function DayClasses({ day, list, now, open, onAdd, titled }: { day: number; list: Session[]; now: number; open: (id: string) => void; onAdd?: () => void; titled?: boolean }) {
  return (
    <section className="mt-5">
      {titled && (
        <h2 className="mb-3 font-display text-xl font-bold">
          {fmtWeekdayLong(day)}, {fmtDate(day)}
        </h2>
      )}
      <div className="space-y-2.5">
        {list.map((s) => <AdminRow key={s.id} session={s} now={now} onOpen={() => open(s.id)} />)}
        {list.length === 0 && !onAdd && <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-muted">No classes.</p>}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/25 p-4 text-sm font-semibold text-muted transition hover:border-ink hover:text-ink"
          >
            <Plus className="h-4 w-4" /> Add a class on {fmtWeekday(day)}, {fmtDate(day)}
          </button>
        )}
      </div>
    </section>
  )
}
