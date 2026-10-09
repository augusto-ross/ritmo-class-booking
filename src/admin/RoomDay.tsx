import { Check, CircleAlert, CircleCheck } from 'lucide-react'
import { CLOSE_HOUR, endOf, freeWindows, OPEN_HOUR } from '../domain/rules'
import { typeOf } from '../domain/catalog'
import type { ID, Session } from '../domain/types'
import { fmtTime, fmtWeekday, fmtDate, toTimeInput } from '../lib/format'
import { cx } from '../components/ui'

interface Props {
  sessions: Session[]
  room: string
  day: number
  durationMin: number
  start: number
  now: number
  ignoreId?: ID
  onPick: (time: string) => void
}

const shortTime = (ms: number) => fmtTime(ms).replace(':00', '')

// A room's day at a glance inside the class form: what is booked, where the new class would sit,
// and the free slots that fit it, one click away.
export function RoomDay({ sessions, room, day, durationMin, start, now, ignoreId, onPick }: Props) {
  const open = new Date(day).setHours(OPEN_HOUR, 0, 0, 0)
  const span = (CLOSE_HOUR - OPEN_HOUR) * 3600000
  const pct = (ms: number) => `${Math.min(100, Math.max(0, ((ms - open) / span) * 100))}%`
  const width = (a: number, b: number) => `${Math.max(0.8, ((Math.min(b, open + span) - Math.max(a, open)) / span) * 100)}%`

  const busy = sessions.filter((s) => s.room === room && s.status === 'scheduled' && s.id !== ignoreId && new Date(s.start).toDateString() === new Date(day).toDateString())
  const windows = freeWindows(sessions, room, day, durationMin, now, ignoreId)
  const end = start + durationMin * 60000
  const valid = !Number.isNaN(start)
  const fits = valid && windows.some((w) => start >= w.start && end <= w.end)
  const clash = valid ? busy.find((s) => s.start < end && start < endOf(s)) : undefined
  const pastShare = now > open ? Math.min(100, ((now - open) / span) * 100) : 0

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-sm font-semibold">
        {room} · {fmtWeekday(day)}, {fmtDate(day)}
      </p>

      {valid && (
        <p className={cx('mt-1 flex items-center gap-1.5 text-[13px] font-medium', fits ? 'text-ok' : 'text-danger')}>
          {fits ? <CircleCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
          {fits
            ? `${fmtTime(start)} – ${fmtTime(end)} is free`
            : clash
              ? `Clashes with ${typeOf(clash.typeId).name} at ${fmtTime(clash.start)}`
              : start < now
                ? 'That time has already passed'
                : 'Outside opening hours'}
        </p>
      )}

      <div className="relative mt-3 h-7 overflow-hidden rounded-lg bg-ok-soft" aria-hidden>
        {pastShare > 0 && (
          <span
            className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,rgb(28_26_23/0.08)_0_4px,transparent_4px_8px)] bg-ink/5"
            style={{ width: `${pastShare}%` }}
          />
        )}
        {busy.map((s) => (
          <span
            key={s.id}
            title={`${typeOf(s.typeId).name} ${fmtTime(s.start)} – ${fmtTime(endOf(s))}`}
            className="absolute inset-y-0 border-x border-white/70"
            style={{ left: pct(s.start), width: width(s.start, endOf(s)), background: typeOf(s.typeId).color, opacity: 0.85 }}
          />
        ))}
        {valid && (
          <span
            className={cx('absolute inset-y-0.5 rounded-md border-2', fits ? 'border-ink bg-white/60' : 'border-danger bg-danger/15')}
            style={{ left: pct(start), width: width(start, end) }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-muted">
        {[6, 10, 14, 18, 22].map((h) => (
          <span key={h}>{shortTime(new Date(day).setHours(h, 0, 0, 0))}</span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <Legend swatch="bg-ok-soft border border-ok/30" label="Free" />
        <Legend swatch="bg-[linear-gradient(90deg,#B45309_0_33%,#0F766E_33%_66%,#6D28D9_66%)]" label="Booked" />
        <Legend swatch="border-2 border-ink bg-white" label="This class" />
        {pastShare > 0 && <Legend swatch="bg-ink/5 bg-[repeating-linear-gradient(135deg,rgb(28_26_23/0.15)_0_2px,transparent_2px_4px)]" label="Past" />}
      </div>

      <p className="mt-3 text-xs font-semibold text-muted">Free slots for a {durationMin}-min class</p>
      {windows.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {windows.map((w) => {
            const on = start >= w.start && end <= w.end
            return (
              <button
                key={w.start}
                type="button"
                onClick={() => onPick(toTimeInput(w.start))}
                title={`Start at ${fmtTime(w.start)}`}
                className={cx(
                  'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition',
                  on ? 'border-ok bg-ok-soft text-ok' : 'border-line bg-white text-ink hover:border-ink/40',
                )}
              >
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {shortTime(w.start)} – {shortTime(w.end)}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-1.5 text-[13px] text-danger">No free slot of {durationMin} minutes in {room} this day.</p>
      )}
      {windows.length > 0 && <p className="mt-1.5 text-[11px] text-muted">Tap a slot to start the class at its first time.</p>}
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cx('h-2.5 w-3.5 rounded-sm', swatch)} />
      {label}
    </span>
  )
}
