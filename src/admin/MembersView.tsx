import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Hourglass, Mail, Search, SlidersHorizontal, UserPlus } from 'lucide-react'
import { Avatar, Button, Chip, cx, Segmented, Select, Sheet } from '../components/ui'
import { MEMBERS, memberOf, typeOf } from '../domain/catalog'
import { adminAdd, hasStarted, isFull, isOpen, rulesOf } from '../domain/rules'
import type { ID, Member, Session } from '../domain/types'
import { DAY, fmtAgo, fmtDay, fmtTime, fmtWhen } from '../lib/format'
import { useApp } from '../store'
import { useAdminActions } from './AdminSheets'
import { PageHead } from './parts'

export type Segment = 'all' | 'attention' | 'inactive'
type Period = '7' | '30'
type SortKey = 'name' | 'rate' | 'last' | 'upcoming' | 'issues'

// No-shows plus late cancels that flag a member, scaled to the period; and no visit for three weeks.
const ATTENTION_AT: Record<string, number> = { 7: 2, 30: 4 }
const INACTIVE_DAYS = 21

interface Row extends Member {
  attended: number
  missed: number
  late: number
  issues: number
  rate: number | null
  last: number | null
  upcoming: number
  favorite: string | null
}

const statsFor = (m: Member, sessions: Session[], now: number, days: number): Row => {
  const from = now - days * DAY
  const past = sessions.filter((s) => s.start > from && hasStarted(s, now))
  const attended = past.filter((s) => s.attendance[m.id] === 'present')
  const missed = past.filter((s) => s.attendance[m.id] === 'absent').length
  const late = past.filter((s) => s.lateCancels.includes(m.id)).length
  const visits = sessions.filter((s) => hasStarted(s, now) && s.attendance[m.id] === 'present')
  const counts: Record<string, number> = {}
  for (const s of attended) counts[s.typeId] = (counts[s.typeId] ?? 0) + 1
  const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return {
    ...m,
    attended: attended.length,
    missed,
    late,
    issues: missed + late,
    rate: attended.length + missed > 0 ? attended.length / (attended.length + missed) : null,
    last: visits.length ? Math.max(...visits.map((s) => s.start)) : null,
    upcoming: sessions.filter((s) => isOpen(s, now) && s.start < now + 7 * DAY && s.booked.includes(m.id)).length,
    favorite,
  }
}

const inactive = (r: Row, now: number) => !r.isNew && (r.last === null || now - r.last > INACTIVE_DAYS * DAY)

const SORT_OPTIONS = [
  { value: 'issues', label: 'Most issues' },
  { value: 'rate', label: 'Attendance rate' },
  { value: 'last', label: 'Last visit' },
  { value: 'upcoming', label: 'Booked next 7 days' },
  { value: 'name', label: 'Name' },
]

export function MembersView({ sessions, now, initialSegment = 'all', initialPeriod = '30' }: { sessions: Session[]; now: number; initialSegment?: Segment; initialPeriod?: Period }) {
  const [segment, setSegment] = useState<Segment>(initialSegment)
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'issues', desc: true })
  const [openId, setOpenId] = useState<ID | null>(null)
  const [options, setOptions] = useState(false)

  const attentionAt = ATTENTION_AT[period]
  const cutoffHours = useApp((s) => rulesOf(s.studio).cutoffHours)
  const rows = useMemo(() => MEMBERS.map((m) => statsFor(m, sessions, now, Number(period))), [sessions, now, period])
  const counts = {
    all: rows.length,
    attention: rows.filter((r) => r.issues >= attentionAt).length,
    inactive: rows.filter((r) => inactive(r, now)).length,
  }

  const value = (r: Row): number | string => {
    switch (sort.key) {
      case 'name': return r.name
      case 'rate': return r.rate ?? -1
      case 'last': return r.last ?? 0
      case 'upcoming': return r.upcoming
      default: return r.issues
    }
  }
  const list = rows
    .filter((r) => (segment === 'attention' ? r.issues >= attentionAt : segment === 'inactive' ? inactive(r, now) : true))
    .filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      const x = value(a)
      const y = value(b)
      const c = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)
      return (sort.desc ? -c : c) || a.name.localeCompare(b.name)
    })

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'name' }))

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort.key)!.label
  const search = (
    <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-full bg-white px-4 shadow-card">
      <Search className="h-4 w-4 shrink-0 text-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members"
        aria-label="Search members"
        className="bare-input min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted"
      />
    </label>
  )

  return (
    <>
      <PageHead title="Members" sub={`${MEMBERS.length} active memberships`} />

      {/* Phone: search and one options button on top, the segments below at full width. */}
      <div className="mb-4 space-y-2.5 @3xl:hidden">
        <div className="flex gap-2">
          {search}
          <button
            onClick={() => setOptions(true)}
            aria-label={`Period and sorting: last ${period} days, ${sortLabel}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-semibold shadow-card"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {period} days
          </button>
        </div>
        <Segmented
          stretch
          label="Segment"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: <>All <span className="opacity-60">{counts.all}</span></> },
            { value: 'attention', label: <>Attention <span className="opacity-60">{counts.attention}</span></> },
            { value: 'inactive', label: <>Inactive <span className="opacity-60">{counts.inactive}</span></> },
          ]}
        />
      </div>

      <div className="mb-4 hidden items-center gap-2 @3xl:flex">
        <Segmented
          label="Segment"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: `All ${counts.all}` },
            { value: 'attention', label: `Needs attention ${counts.attention}` },
            { value: 'inactive', label: `Inactive ${counts.inactive}` },
          ]}
        />
        <span className="flex-1" />
        <div className="w-60">{search}</div>
        <Select
          label="Period"
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={[{ value: '30', label: 'Last 30 days' }, { value: '7', label: 'Last 7 days' }]}
          align="right"
        />
      </div>

      <Sheet open={options} onClose={() => setOptions(false)} label="Period and sorting">
        <div className="overflow-y-auto px-5 pb-2 pt-6">
          <h2 className="font-display text-2xl font-bold">Period and sorting</h2>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-muted">Period</p>
          <div className="flex flex-wrap gap-2">
            {(['30', '7'] as Period[]).map((p) => (
              <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>Last {p} days</Chip>
            ))}
          </div>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-muted">Sort by</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.value} active={sort.key === o.value} onClick={() => setSort({ key: o.value as SortKey, desc: o.value !== 'name' })}>{o.label}</Chip>
            ))}
          </div>
        </div>
        <div className="px-5 pb-6 pt-5">
          <Button variant="dark" className="w-full" onClick={() => setOptions(false)}>Done</Button>
        </div>
      </Sheet>

      <p className="mb-4 max-w-2xl text-[13px] text-muted">
        <span className="font-semibold text-ink @3xl:hidden">Sorted by {sortLabel.toLowerCase()}. </span>
        {segment === 'attention'
          ? `Members with ${attentionAt} or more no-shows or late cancellations (inside ${cutoffHours} hours) in the period. Tracked, not penalised: use it to start a conversation, or to decide on a policy.`
          : segment === 'inactive'
            ? `No class in the last ${INACTIVE_DAYS} days. A good list for a "we miss you" message.`
            : 'Attendance rate counts classes attended out of classes booked and not cancelled in time.'}
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card @3xl:block">
        <div className="grid grid-cols-[minmax(0,1.6fr)_150px_130px_96px_110px_160px_20px] items-center gap-3 border-b border-line bg-sand/50 px-4 py-2.5">
          <SortHead label="Member" k="name" sort={sort} onSort={sortBy} />
          <SortHead label="Attendance" k="rate" sort={sort} onSort={sortBy} />
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Usual class</span>
          <SortHead label="Next 7 days" k="upcoming" sort={sort} onSort={sortBy} center />
          <SortHead label="Last visit" k="last" sort={sort} onSort={sortBy} />
          <SortHead label="Issues" k="issues" sort={sort} onSort={sortBy} right />
          <span />
        </div>
        {list.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpenId(r.id)}
            className="grid w-full grid-cols-[minmax(0,1.6fr)_150px_130px_96px_110px_160px_20px] items-center gap-3 border-b border-line px-4 py-2.5 text-left text-sm transition last:border-0 hover:bg-sand/40"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar name={r.name} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate font-medium">
                  {r.name}
                  {r.isNew && <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">New</span>}
                </span>
                <span className="block truncate text-xs text-muted">{r.email}</span>
              </span>
            </span>
            <RateBar rate={r.rate} attended={r.attended} />
            <UsualClass typeId={r.favorite} />
            <span className="text-center tabular-nums">{r.upcoming || <span className="text-muted">–</span>}</span>
            <LastVisit last={r.last} now={now} />
            <span className="flex justify-end">
              <Issues missed={r.missed} late={r.late} />
            </span>
            <ChevronRight className="h-4 w-4 text-ink/30" />
          </button>
        ))}
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted">No members match.</p>}
      </div>

      {/* Phone cards */}
      <div className="space-y-2 @3xl:hidden">
        {list.map((r) => (
          <button key={r.id} onClick={() => setOpenId(r.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card">
            <Avatar name={r.name} className="h-10 w-10" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{r.name}</span>
                <Issues missed={r.missed} late={r.late} />
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span>{r.rate === null ? 'No classes yet' : `${Math.round(r.rate * 100)}% attendance`}</span>
                <span>·</span>
                <span>{r.last ? `Last visit: ${fmtAgo(r.last, now)}` : 'Never visited'}</span>
              </span>
            </span>
          </button>
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-muted">No members match.</p>}
      </div>

      <MemberSheet row={rows.find((r) => r.id === openId)} sessions={sessions} now={now} period={period} onClose={() => setOpenId(null)} />
    </>
  )
}

function SortHead({ label, k, sort, onSort, right, center }: { label: string; k: SortKey; sort: { key: SortKey; desc: boolean }; onSort: (k: SortKey) => void; right?: boolean; center?: boolean }) {
  const on = sort.key === k
  const Icon = sort.desc ? ArrowDown : ArrowUp
  return (
    <button
      onClick={() => onSort(k)}
      aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : undefined}
      className={cx(
        'group inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide transition',
        on ? 'text-ink' : 'text-muted hover:text-ink',
        right && 'justify-self-end',
        center && 'justify-self-center',
      )}
    >
      {label}
      <Icon className={cx('h-3 w-3', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} />
    </button>
  )
}

function RateBar({ rate, attended }: { rate: number | null; attended: number }) {
  if (rate === null) return <span className="text-xs text-muted">No classes</span>
  const pct = Math.round(rate * 100)
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-ink/10">
        <span className={cx('block h-full rounded-full', pct < 75 ? 'bg-danger' : pct < 90 ? 'bg-warn' : 'bg-ok')} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums font-medium">{pct}%</span>
      <span className="text-xs text-muted">({attended})</span>
    </span>
  )
}

function LastVisit({ last, now }: { last: number | null; now: number }) {
  if (!last) return <span className="text-xs text-muted">Never</span>
  const stale = now - last > INACTIVE_DAYS * DAY
  return <span className={cx('text-sm', stale && 'font-semibold text-danger')}>{fmtAgo(last, now)}</span>
}

function UsualClass({ typeId }: { typeId: string | null }) {
  if (!typeId) return <span className="text-xs text-muted">–</span>
  const t = typeOf(typeId)
  return (
    <span className="inline-flex items-center gap-1.5 truncate text-sm">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
      {t.name}
    </span>
  )
}

function Issues({ missed, late }: { missed: number; late: number }) {
  if (missed + late === 0) return <span className="text-xs text-muted">None</span>
  return (
    <span className="inline-flex shrink-0 gap-1 whitespace-nowrap" title={`${missed} no-shows, ${late} late cancels`}>
      {missed > 0 && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{missed} missed</span>}
      {late > 0 && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">{late} late</span>}
    </span>
  )
}

function MemberSheet({ row, sessions, now, period, onClose }: { row: Row | undefined; sessions: Session[]; now: number; period: Period; onClose: () => void }) {
  return (
    <Sheet open={!!row} onClose={onClose} label="Member" variant="drawer">
      {row && <MemberDetail key={row.id} row={row} sessions={sessions} now={now} period={period} />}
    </Sheet>
  )
}

function MemberDetail({ row, sessions, now, period }: { row: Row; sessions: Session[]; now: number; period: Period }) {
  const act = useAdminActions()
  const [booking, setBooking] = useState('')
  const upcoming = sessions.filter((s) => isOpen(s, now) && s.start < now + 7 * DAY && (s.booked.includes(row.id) || s.waitlist.includes(row.id)))
  const history = sessions
    .filter((s) => hasStarted(s, now) && (s.attendance[row.id] || s.lateCancels.includes(row.id)))
    .sort((a, b) => b.start - a.start)
    .slice(0, 8)
  const bookable = sessions
    .filter((s) => isOpen(s, now) && s.start < now + 7 * DAY && !s.booked.includes(row.id) && !s.waitlist.includes(row.id))
    .slice(0, 40)
  const member = memberOf(row.id)

  return (
    <>
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <Avatar name={row.name} className="h-14 w-14 bg-ink text-base text-paper" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-bold">{row.name}</h2>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted">
              <Mail className="h-3.5 w-3.5" />
              {member.email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-3 gap-2">
          <Mini label="Attendance" value={row.rate === null ? '–' : `${Math.round(row.rate * 100)}%`} />
          <Mini label="Classes" value={row.attended} />
          <Mini label="Issues" value={row.issues} tone={row.issues >= ATTENTION_AT[period] ? 'warn' : undefined} />
        </div>
        <p className="-mt-4 text-xs text-muted">
          Last {period} days · {row.missed} no-shows, {row.late} late cancels
          {row.favorite && <> · usually {typeOf(row.favorite).name}</>}
        </p>

        <Section title="Next 7 days" count={upcoming.length}>
          {upcoming.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 py-2.5 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: typeOf(s.typeId).color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{typeOf(s.typeId).name}</span>
                <span className="block text-xs text-muted">{fmtWhen(s.start, now)} · {s.room}</span>
              </span>
              {s.waitlist.includes(row.id) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                  <Hourglass className="h-3 w-3" />#{s.waitlist.indexOf(row.id) + 1} waiting
                </span>
              ) : (
                <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">Booked</span>
              )}
            </li>
          ))}
          {upcoming.length === 0 && <li className="py-3 text-sm text-muted">Nothing booked.</li>}
        </Section>

        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Book into a class</span>
            <Select
              variant="field"
              label="Book into a class"
              placeholder="Choose a class this week…"
              value={booking}
              onChange={setBooking}
              options={bookable.map((s) => ({
                value: s.id,
                label: `${typeOf(s.typeId).name} · ${fmtDay(s.start, now).split(',')[0]} ${fmtTime(s.start)}${isFull(s) ? ' (waitlist)' : ''}`,
                color: typeOf(s.typeId).color,
              }))}
            />
          </div>
          <Button
            variant="dark"
            disabled={!booking}
            onClick={() => {
              const s = sessions.find((x) => x.id === booking)!
              act((st, t) => adminAdd(st, booking, row.id, t), `${row.name.split(' ')[0]} ${isFull(s) ? 'added to the waitlist' : 'booked'}`, `${typeOf(s.typeId).name}, ${fmtWhen(s.start, now)}`)
              setBooking('')
            }}
          >
            <UserPlus className="h-4 w-4" /> Book
          </Button>
        </div>

        <Section title="Recent history">
          {history.map((s) => {
            const late = s.lateCancels.includes(row.id)
            const mark = s.attendance[row.id]
            return (
              <li key={s.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: typeOf(s.typeId).color }} />
                <span className="min-w-0 flex-1 truncate">
                  {typeOf(s.typeId).name} <span className="text-muted">· {fmtDay(s.start, now)}</span>
                </span>
                <span className={cx('text-xs font-semibold', late ? 'text-warn' : mark === 'absent' ? 'text-danger' : 'text-ok')}>
                  {late ? 'Late cancel' : mark === 'absent' ? 'No-show' : 'Attended'}
                </span>
              </li>
            )
          })}
          {history.length === 0 && <li className="py-3 text-sm text-muted">No classes yet.</li>}
        </Section>
      </div>
    </>
  )
}

function Mini({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cx('mt-0.5 font-display text-2xl font-bold', tone === 'warn' && 'text-brand')}>{value}</p>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center justify-between text-sm font-bold">
        {title} {count !== undefined && <span className="font-medium text-muted">{count}</span>}
      </h3>
      <ul className="divide-y divide-line rounded-2xl bg-white px-3 shadow-card">{children}</ul>
    </section>
  )
}

