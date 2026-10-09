import type { ReactNode } from 'react'
import { Mail, Star } from 'lucide-react'
import { Avatar, cx, Select } from '../components/ui'
import { memberOf, typeOf } from '../domain/catalog'
import { prefsOf, setPrefs, toggleFavorite } from '../domain/rules'
import type { ID } from '../domain/types'
import { useApp, useToasts, type MemberId } from '../store'

const REMINDERS = [
  { value: '0', label: 'No reminder' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

// Favourites are stored as "typeId|weekday|HH:MM".
const describe = (key: string) => {
  const [typeId, day, time] = key.split('|')
  const [h, m] = time.split(':').map(Number)
  return { type: typeOf(typeId), when: `${WEEKDAYS[Number(day)]}s at ${timeFmt.format(new Date(2000, 0, 1, h, m))}` }
}

export function ProfileView({ memberId }: { memberId: ID }) {
  const studio = useApp((s) => s.studio)
  const apply = useApp((s) => s.apply)
  const push = useToasts((s) => s.push)
  const prefs = prefsOf(studio, memberId)
  const member = memberOf(memberId)
  const favorites = studio.favorites[memberId] ?? []

  const save = (patch: Partial<typeof prefs>, title: string) => {
    apply((st) => setPrefs(st, memberId, { ...prefs, ...patch }))
    push({ scope: memberId as MemberId, tone: 'success', title })
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-3">
        <Avatar name={member.name} className="h-14 w-14 bg-ink text-base text-paper" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold">{member.name}</h1>
          <p className="truncate text-sm text-muted">{member.email}</p>
        </div>
      </div>

      <Group title="Notifications">
        <div className="p-4">
          <p className="text-sm font-semibold">Class reminder</p>
          <p className="mb-2 mt-0.5 text-[13px] text-muted">Before every class you booked.</p>
          <Select
            variant="field"
            label="Class reminder"
            value={String(prefs.reminderMin)}
            onChange={(v) => save({ reminderMin: Number(v) }, v === '0' ? 'Reminders off' : 'Reminder updated')}
            options={REMINDERS}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 p-4">
          <Mail className="h-5 w-5 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Email me too</span>
            <span className="block text-[13px] text-muted">Updates always appear here in the app.</span>
          </span>
          <Switch on={prefs.email} onChange={(email) => save({ email }, email ? 'Emails on' : 'Emails off')} label="Email me too" />
        </label>
      </Group>

      <Group title="Your week">
        {favorites.map((key) => {
          const { type, when } = describe(key)
          return (
            <div key={key} className="flex items-center gap-3 px-4 py-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: type.color }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{type.name}</span>
                <span className="block text-[13px] text-muted">{when}</span>
              </span>
              <button
                onClick={() => apply((st) => toggleFavorite(st, memberId, key))}
                aria-label={`Remove ${type.name}, ${when} from your week`}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"
              >
                <Star className="h-[18px] w-[18px] fill-[#F5A524] text-[#F5A524]" />
              </button>
            </div>
          )
        })}
        {favorites.length === 0 && <p className="p-4 text-sm text-muted">Star a class in the schedule to add it to your week.</p>}
      </Group>

      <p className="mt-6 text-center text-xs text-muted">Ritmo Studio · Questions? Talk to the front desk.</p>
    </>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted">{title}</h2>
      <div className="divide-y divide-line rounded-2xl bg-white shadow-card">{children}</div>
    </section>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault()
        onChange(!on)
      }}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition', on ? 'bg-ok' : 'bg-ink/20')}
    >
      <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}
