import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { cx, Select } from '../components/ui'
import { DEFAULT_RULES, rulesOf, setRules } from '../domain/rules'
import type { LateSpot, StudioRules } from '../domain/types'
import { useApp, useToasts } from '../store'
import { PageHead } from './parts'

const LATE_SPOT: { value: LateSpot; title: string; body: string }[] = [
  { value: 'open', title: 'Alert everyone waiting', body: 'The first to book gets the spot.' },
  { value: 'next', title: 'Give it to the next in line', body: 'They are booked automatically and notified.' },
  { value: 'hold', title: 'Hold it for the front desk', body: 'Nobody is notified. You give the spot from the class roster.' },
]

const hours = (n: number) => ({ value: String(n), label: `${n} ${n === 1 ? 'hour' : 'hours'} before` })
const minutes = (n: number) => ({ value: String(n), label: `${n} minutes before` })

export function RulesView() {
  const rules = useApp((s) => rulesOf(s.studio))
  const apply = useApp((s) => s.apply)
  const push = useToasts((s) => s.push)

  const change = (patch: Partial<StudioRules>, title: string) => {
    const before = rules
    apply((st) => setRules(st, { ...rules, ...patch }))
    push({ scope: 'admin', tone: 'success', title, body: 'Applies to every class from now on', undo: () => apply((st) => setRules(st, before)) })
  }
  const isDefault = JSON.stringify(rules) === JSON.stringify(DEFAULT_RULES)

  return (
    <div>
      <PageHead title="Studio rules" sub="Changes apply to every class straight away">
        {!isDefault && (
          <button
            onClick={() => change(DEFAULT_RULES, 'Rules reset to the defaults')}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:bg-ink/5 hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </button>
        )}
      </PageHead>

      <Group title="Cancellations" description="When members can cancel without it counting as late.">
        <Row label="Free cancellation until" help="Later cancellations still free the spot, but count as late.">
          <Select
            variant="field"
            label="Free cancellation until"
            value={String(rules.cutoffHours)}
            onChange={(v) => change({ cutoffHours: Number(v) }, 'Cancellation cutoff updated')}
            options={[1, 2, 3, 6, 12].map(hours)}
          />
        </Row>
      </Group>

      <Group title="Waitlist" description="Who gets a spot when someone cancels.">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold">When a spot opens after the cutoff</p>
          <p className="mt-0.5 text-[13px] text-muted">Before the cutoff, a freed spot always goes to the first person waiting.</p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="When a spot opens after the cutoff">
            {LATE_SPOT.map((o) => {
              const on = rules.lateSpot === o.value
              return (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={on}
                  onClick={() => !on && change({ lateSpot: o.value }, 'Waitlist rule updated')}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                    on ? 'border-ink bg-sand/40' : 'border-line hover:border-ink/40',
                  )}
                >
                  <span className={cx('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2', on ? 'border-ink' : 'border-ink/25')}>
                    {on && <span className="h-2 w-2 rounded-full bg-ink" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                      {o.title}
                      {o.value === DEFAULT_RULES.lateSpot && <span className="text-xs font-medium text-muted">Recommended</span>}
                    </span>
                    <span className="block text-[13px] text-muted">{o.body}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Group>

      <Group title="Check-in" description="When the front desk marks who came.">
        <Row label="Check-in opens" help="Members left unmarked after class show as “not checked in”, not as no-shows.">
          <Select
            variant="field"
            label="Check-in opens"
            value={String(rules.checkInMinutes)}
            onChange={(v) => change({ checkInMinutes: Number(v) }, 'Check-in window updated')}
            options={[30, 60, 90, 120].map(minutes)}
          />
        </Row>
      </Group>
    </div>
  )
}

// On wide screens each group reads like a settings page: name and purpose on the left, controls on the right.
function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="mb-6 grid gap-x-10 gap-y-2 border-line @4xl:mb-0 @4xl:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] @4xl:border-t @4xl:py-8 @4xl:first-of-type:border-t-0 @4xl:first-of-type:pt-2">
      <div className="px-1 @4xl:px-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted @4xl:font-display @4xl:text-lg @4xl:normal-case @4xl:tracking-normal @4xl:text-ink">{title}</h2>
        <p className="mt-1 hidden text-[13px] text-muted @4xl:block">{description}</p>
      </div>
      <div className="@container divide-y divide-line rounded-2xl bg-white shadow-card">{children}</div>
    </section>
  )
}

function Row({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 @lg:flex-row @lg:items-center @lg:justify-between @lg:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-[13px] text-muted">{help}</p>
      </div>
      <div className="@lg:w-52 @lg:shrink-0">{children}</div>
    </div>
  )
}
