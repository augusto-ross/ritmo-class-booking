import { useMemo, useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Avatar, Button, Chip, cx, Sheet, Tag } from '../components/ui'
import { CLASS_TYPES, INSTRUCTORS, instructorOf, typeOf } from '../domain/catalog'
import { hasStarted } from '../domain/rules'
import type { ID, Session } from '../domain/types'
import { addDays, fmtDate, fmtWeekday, sameDay, startOfDay } from '../lib/format'
import { Empty, SessionRow, type MemberActions } from './parts'

const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const WEEKS = 2
const PERIODS = [
  { label: 'Morning', until: 12 },
  { label: 'Afternoon', until: 17 },
  { label: 'Evening', until: 24 },
]

interface Props {
  memberId: ID
  now: number
  sessions: Session[]
  actions: MemberActions
  open: (id: ID) => void
}

export function ScheduleView({ memberId, now, sessions, actions, open }: Props) {
  const today = startOfDay(now)
  const [week, setWeek] = useState(0)
  const [day, setDay] = useState(today)
  const [typeId, setTypeId] = useState<ID | null>(null)
  const [instructorId, setInstructorId] = useState<ID | null>(null)
  const [filtering, setFiltering] = useState(false)
  const [showEarlier, setShowEarlier] = useState(false)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, week * 7 + i)), [today, week])
  const match = (s: Session) => (!typeId || s.typeId === typeId) && (!instructorId || s.instructorId === instructorId)
  const all = sessions.filter((s) => sameDay(s.start, day) && match(s))
  const earlier = all.filter((s) => hasStarted(s, now))
  const list = showEarlier ? all : all.filter((s) => !hasStarted(s, now))
  const active = (typeId ? 1 : 0) + (instructorId ? 1 : 0)
  const clear = () => {
    setTypeId(null)
    setInstructorId(null)
  }
  const pick = (d: number) => {
    setDay(d)
    setShowEarlier(false)
  }
  const goWeek = (w: number) => {
    setWeek(w)
    pick(addDays(today, w * 7))
  }

  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold">Schedule</h1>
        <button
          onClick={() => setFiltering(true)}
          className={cx('inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition', active ? 'bg-ink text-paper' : 'bg-white text-ink shadow-card hover:bg-sand')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {active > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-bright px-1 text-xs font-bold text-ink">{active}</span>
          )}
        </button>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-3 shadow-card">
        <div className="mb-2 flex items-center justify-between pl-2">
          <p className="font-display text-base font-bold">{monthFmt.format(days[0])}</p>
          <div className="flex">
            <button aria-label="Previous week" disabled={week === 0} onClick={() => goWeek(week - 1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand disabled:opacity-25">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button aria-label="Next week" disabled={week === WEEKS - 1} onClick={() => goWeek(week + 1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand disabled:opacity-25">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const on = d === day
            const mine = sessions.some((s) => sameDay(s.start, d) && s.status === 'scheduled' && s.booked.includes(memberId))
            return (
              <button
                key={d}
                onClick={() => pick(d)}
                aria-pressed={on}
                aria-label={`${fmtWeekday(d)} ${fmtDate(d)}${mine ? ', you have a booking' : ''}`}
                className={cx('relative flex h-[62px] flex-col items-center justify-center rounded-2xl transition', on ? 'bg-ink text-paper' : 'hover:bg-sand')}
              >
                <span className={cx('text-[11px] font-semibold uppercase', on ? 'text-paper/70' : d === today ? 'text-brand' : 'text-muted')}>
                  {d === today ? 'Today' : fmtWeekday(d)}
                </span>
                <span className="font-display text-lg font-bold leading-tight">{new Date(d).getDate()}</span>
                {mine && <span className={cx('absolute bottom-1.5 h-1 w-1 rounded-full', on ? 'bg-brand-bright' : 'bg-brand')} />}
              </button>
            )
          })}
        </div>
      </div>

      {active > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {typeId && <Tag label={typeOf(typeId).name} color={typeOf(typeId).color} onRemove={() => setTypeId(null)} />}
          {instructorId && <Tag label={instructorOf(instructorId).name} onRemove={() => setInstructorId(null)} />}
        </div>
      )}

      {earlier.length > 0 && (
        <button onClick={() => setShowEarlier(!showEarlier)} className="mt-4 text-[13px] font-semibold text-muted hover:text-ink">
          {showEarlier ? 'Hide' : 'Show'} {earlier.length} earlier {earlier.length === 1 ? 'class' : 'classes'}
        </button>
      )}

      {PERIODS.map(({ label, until }, i) => {
        const from = i === 0 ? 0 : PERIODS[i - 1].until
        const group = list.filter((s) => {
          const h = new Date(s.start).getHours()
          return h >= from && h < until
        })
        if (group.length === 0) return null
        return (
          <section key={label} className="mt-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{label}</h2>
            <div className="space-y-2.5">
              {group.map((s) => (
                <SessionRow key={s.id} session={s} memberId={memberId} now={now} actions={actions} onOpen={() => open(s.id)} quick />
              ))}
            </div>
          </section>
        )
      })}

      {list.length === 0 && (
        <div className="mt-5">
          <Empty icon={CalendarX} title={all.length > 0 ? 'No more classes today' : active ? 'No classes match your filters' : 'No classes this day'}>
            {active > 0 && all.length === 0 ? (
              <Button size="sm" variant="outline" className="mt-2" onClick={clear}>Clear filters</Button>
            ) : (
              'Pick another day above.'
            )}
          </Empty>
        </div>
      )}

      <Sheet open={filtering} onClose={() => setFiltering(false)} label="Filters">
        <div className="overflow-y-auto px-5 pb-2 pt-6">
          <h2 className="font-display text-2xl font-bold">Filters</h2>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-muted">Class</p>
          <div className="flex flex-wrap gap-2">
            {CLASS_TYPES.map((t) => (
              <Chip key={t.id} active={typeId === t.id} color={t.color} onClick={() => setTypeId(typeId === t.id ? null : t.id)}>
                {t.name}
              </Chip>
            ))}
          </div>
          <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-muted">Instructor</p>
          <div className="flex flex-wrap gap-2">
            {INSTRUCTORS.map((i) => (
              <Chip key={i.id} active={instructorId === i.id} lead={<Avatar name={i.name} src={i.photo} className="h-7 w-7 text-[10px]" />} onClick={() => setInstructorId(instructorId === i.id ? null : i.id)}>
                {i.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2 px-5 pb-6 pt-5">
          <Button variant="outline" disabled={!active} onClick={clear}>Clear</Button>
          <Button variant="dark" onClick={() => setFiltering(false)}>
            Show {all.length} {all.length === 1 ? 'class' : 'classes'}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
