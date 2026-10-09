import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Minus, Plus } from 'lucide-react'
import { cx } from './ui'

interface Pos {
  left: number
  top?: number
  bottom?: number
  width: number
  maxHeight: number
}

// A panel anchored to a form field. It is portalled to <body> so a scrolling drawer cannot clip it,
// and opens upwards when there is more room above.
function useAnchored(height: number, minWidth: number) {
  const [pos, setPos] = useState<Pos | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = () => setPos(null)

  const toggle = () => {
    if (pos) return close()
    const r = trigger.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < height && above > below
    const width = Math.max(minWidth, r.width)
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      width,
      maxHeight: Math.min(height, up ? above : below),
    })
  }

  useEffect(() => {
    if (!pos) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!trigger.current?.contains(t) && !panel.current?.contains(t)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
      trigger.current?.focus()
    }
    const onMove = (e: Event) => !panel.current?.contains(e.target as Node) && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  return { pos, trigger, panel, toggle, close }
}

function FieldButton({ open, icon, label, children, ...rest }: { open: boolean; icon: ReactNode; label: string; children: ReactNode } & { buttonRef: React.Ref<HTMLButtonElement>; onClick: () => void }) {
  return (
    <button
      ref={rest.buttonRef}
      type="button"
      onClick={rest.onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      className={cx(
        'inline-flex h-11 w-full items-center gap-2 rounded-xl border bg-white pl-3 pr-3 text-left text-sm font-medium transition',
        open ? 'border-ink ring-2 ring-ink/10' : 'border-line hover:border-ink/40',
      )}
    >
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      <ChevronDown className={cx('h-4 w-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
    </button>
  )
}

function Panel({ pos, panelRef, label, children }: { pos: Pos | null; panelRef: React.Ref<HTMLDivElement>; label: string; children: ReactNode }) {
  return createPortal(
    <AnimatePresence>
      {pos && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          initial={{ opacity: 0, y: pos.top !== undefined ? -6 : 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="menu-panel fixed z-[60] overflow-y-auto rounded-2xl bg-white p-3 shadow-pop ring-1 ring-ink/5"
          style={pos}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// Dates travel as "YYYY-MM-DD" strings, like a native date input.
export const toDateValue = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromDateValue = (v: string) => {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

const longDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
// The year only matters when it is not this one.
const fmtField = (d: number) => (new Date(d).getFullYear() === new Date().getFullYear() ? shortDate : longDate).format(d)
const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DateField({ value, onChange, min, label }: { value: string; onChange: (v: string) => void; min?: string; label: string }) {
  const { pos, trigger, panel, toggle, close } = useAnchored(360, 296)
  const selected = fromDateValue(value)
  const [view, setView] = useState(() => new Date(new Date(selected).getFullYear(), new Date(selected).getMonth(), 1).getTime())
  const today = toDateValue(Date.now())

  useEffect(() => {
    if (pos) setView(new Date(new Date(selected).getFullYear(), new Date(selected).getMonth(), 1).getTime())
  }, [pos !== null])

  const v = new Date(view)
  const count = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: count }, (_, i) => toDateValue(new Date(v.getFullYear(), v.getMonth(), i + 1).getTime()))
  const shift = (n: number) => setView(new Date(v.getFullYear(), v.getMonth() + n, 1).getTime())
  const canGoBack = !min || toDateValue(new Date(v.getFullYear(), v.getMonth(), 0).getTime()) >= min

  return (
    <>
      <FieldButton buttonRef={trigger} onClick={toggle} open={!!pos} label={label} icon={<CalendarDays className="h-4 w-4" />}>
        {fmtField(selected)}
      </FieldButton>
      <Panel pos={pos} panelRef={panel} label={label}>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Previous month" disabled={!canGoBack} onClick={() => shift(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand disabled:opacity-25">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-display text-base font-bold">{monthTitle.format(view)}</p>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="py-1 text-[11px] font-bold uppercase text-muted">{w}</span>
          ))}
          {Array.from({ length: v.getDay() }, (_, i) => <span key={`pad${i}`} />)}
          {days.map((d) => {
            const disabled = !!min && d < min
            const on = d === value
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={() => {
                  onChange(d)
                  close()
                  trigger.current?.focus()
                }}
                className={cx(
                  'relative flex h-9 items-center justify-center rounded-full text-sm font-semibold transition disabled:font-normal disabled:text-ink/25',
                  on ? 'bg-ink text-paper' : 'hover:bg-sand',
                )}
              >
                {Number(d.slice(-2))}
                {d === today && <span className={cx('absolute bottom-1 h-1 w-1 rounded-full', on ? 'bg-brand-bright' : 'bg-brand')} />}
              </button>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const labelFor = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return timeFmt.format(new Date(2000, 0, 1, h, m))
}

// Times travel as "HH:MM". The list covers studio hours in 15-minute steps.
export function TimeField({ value, onChange, label, from = 6, to = 22, note }: { value: string; onChange: (v: string) => void; label: string; from?: number; to?: number; note?: (time: string) => string | undefined }) {
  const { pos, trigger, panel, toggle, close } = useAnchored(300, 230)
  const slots: string[] = []
  for (let h = from; h <= to; h++) for (const m of [0, 15, 30, 45]) slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  if (!slots.includes(value)) slots.push(value)
  slots.sort()

  useEffect(() => {
    if (!pos) return
    const el = panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    el?.scrollIntoView({ block: 'center' })
    el?.focus({ preventScroll: true })
  }, [pos !== null])

  return (
    <>
      <FieldButton buttonRef={trigger} onClick={toggle} open={!!pos} label={label} icon={<Clock className="h-4 w-4" />}>
        {labelFor(value)}
      </FieldButton>
      <Panel pos={pos} panelRef={panel} label={label}>
        <div className="-m-1.5 space-y-0.5">
          {slots.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === value}
              onClick={() => {
                onChange(t)
                close()
                trigger.current?.focus()
              }}
              className={cx(
                'flex h-10 w-full items-center rounded-xl px-3 text-left text-sm outline-none hover:bg-sand focus-visible:bg-sand',
                t === value ? 'font-semibold' : 'font-medium',
                t.endsWith(':00') ? 'text-ink' : 'text-ink/70',
              )}
            >
              <span className={cx('flex-1', note?.(t) && 'text-ink/40')}>{labelFor(t)}</span>
              {note?.(t) && <span className="mr-2 text-[11px] font-semibold text-warn">{note(t)}</span>}
              {t === value && <Check className="h-4 w-4 text-brand" strokeWidth={2.6} />}
            </button>
          ))}
        </div>
      </Panel>
    </>
  )
}

interface StepperProps {
  value: number
  onChange: (v: number) => void
  label: string
  min: number
  max: number
  step?: number
  unit?: string
}

export function Stepper({ value, onChange, label, min, max, step = 1, unit }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  const btn = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink transition hover:bg-sand disabled:opacity-25 disabled:hover:bg-transparent'
  return (
    <div className="flex h-11 items-center gap-1 rounded-xl border border-line bg-white px-1 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10">
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => set(value - step)} className={btn}>
        <Minus className="h-4 w-4" />
      </button>
      <label className="flex flex-1 items-baseline justify-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ''))
            onChange(Number.isNaN(n) ? min : n)
          }}
          onBlur={() => set(value)}
          className="bare-input w-10 bg-transparent text-center text-sm font-semibold"
        />
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </label>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => set(value + step)} className={btn}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
