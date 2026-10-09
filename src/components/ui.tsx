import { useEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, Check, CheckCircle2, ChevronDown, Info, X } from 'lucide-react'
import { initials } from '../domain/catalog'
import { markToasted } from '../domain/rules'
import type { ID, Notice } from '../domain/types'
import { useApp, useToasts, type Scope } from '../store'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

export const useNow = () => {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-display text-2xl font-bold tracking-tight', light ? 'text-paper' : 'text-ink', className)}>
      <svg viewBox="0 0 28 24" className="h-[0.8em] w-auto" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 13h5l3-9 5 17 3-11 1.5 3H26" />
      </svg>
      <span>
        ritmo<span className="text-brand-bright">.</span>
      </span>
    </span>
  )
}

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-[#bd3a17] active:scale-[0.98]',
  dark: 'bg-ink text-paper hover:bg-black active:scale-[0.98]',
  outline: 'border border-ink/20 bg-white text-ink hover:border-ink/50 active:scale-[0.98]',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger-soft active:scale-[0.98]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-40',
        size === 'sm' && 'h-9 px-4 text-sm',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-13 px-6 text-base',
        VARIANTS[variant],
        className,
      )}
    />
  )
}

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  if (src) {
    return <img src={src} alt="" aria-hidden className={cx('h-9 w-9 shrink-0 rounded-full bg-sand object-cover object-top', className)} />
  }
  return (
    <span className={cx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', !className?.includes('bg-') && 'bg-sand text-ink', className)} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10" role="img" aria-label={`${value} of ${max} spots taken`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  label: string
  // "drawer" docks to the right edge when the container is wide enough.
  variant?: 'sheet' | 'drawer'
  children: ReactNode
}

export function Sheet({ open, onClose, label, variant = 'sheet', children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-40" role="dialog" aria-modal aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cx(
              'absolute inset-x-0 bottom-0 flex max-h-[94%] flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-pop',
              variant === 'drawer' && '@3xl:inset-y-0 @3xl:left-auto @3xl:right-0 @3xl:max-h-none @3xl:w-[460px] @3xl:rounded-none',
            )}
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink backdrop-blur hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const TONE = {
  success: { icon: CheckCircle2, color: 'text-[#7ee2a0]' },
  info: { icon: Info, color: 'text-paper/70' },
  alert: { icon: BellRing, color: 'text-brand-bright' },
}

export function Toaster({ scope }: { scope: Scope }) {
  const toasts = useToasts((s) => s.toasts).filter((t) => t.scope === scope)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-50 flex flex-col items-center gap-2" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = TONE[t.tone].icon
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ y: -24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0, pointerEvents: 'none', transition: { duration: 0.15 } }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-pop"
            >
              <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', TONE[t.tone].color)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[13px] leading-snug text-paper/75">{t.body}</p>}
              </div>
              {t.undo && (
                <button
                  onClick={() => {
                    t.undo!()
                    dismiss(t.id)
                  }}
                  className="rounded-full px-2 py-0.5 text-sm font-semibold text-brand-bright hover:bg-white/10"
                >
                  Undo
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Surfaces notifications caused by someone else (a promotion, a cancelled class) as toasts
// for the member currently on screen.
export const useNoticeToasts = (memberId: ID, scope: Scope, notices: Notice[]) => {
  useEffect(() => {
    const pending = useApp.getState().studio.notices.filter((n) => n.memberId === memberId && !n.toasted)
    if (pending.length === 0) return
    useApp.getState().apply((studio) => markToasted(studio, pending.map((n) => n.id)))
    for (const n of pending.slice(0, 2)) {
      useToasts.getState().push({ scope, tone: n.kind === 'promoted' ? 'success' : 'alert', title: n.title, body: n.body })
    }
  }, [memberId, scope, notices])
}

export interface Option {
  value: string
  label: string
  color?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  label: string
  // "pill" for toolbars and filters, "field" for forms.
  variant?: 'pill' | 'field'
  // Filters read as "on" when anything but the first option is picked.
  filter?: boolean
  placeholder?: string
  disabled?: boolean
  align?: 'left' | 'right'
  className?: string
}

interface MenuPos {
  left?: number
  right?: number
  top?: number
  bottom?: number
  width: number
  maxHeight: number
}

const MENU_MAX = 288

export function Select({ value, onChange, options, label, variant = 'pill', filter, placeholder, disabled, align = 'left', className }: SelectProps) {
  const [pos, setPos] = useState<MenuPos | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLUListElement>(null)
  const open = pos !== null
  const current = options.find((o) => o.value === value)
  const shown = current ?? (placeholder ? undefined : options[0])
  const on = filter && current !== undefined && current !== options[0]
  const field = variant === 'field'

  const close = () => setPos(null)
  const toggle = () => {
    if (open) return close()
    const r = trigger.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    // Open upwards when there is clearly more room above, e.g. a field near the bottom of a drawer.
    const up = below < Math.min(MENU_MAX, options.length * 40 + 12) && above > below
    const width = field ? r.width : Math.max(210, r.width)
    setPos({
      ...(align === 'right' ? { right: window.innerWidth - r.right } : { left: Math.min(r.left, window.innerWidth - width - 8) }),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      width,
      maxHeight: Math.min(MENU_MAX, up ? above : below),
    })
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!trigger.current?.contains(t) && !menu.current?.contains(t)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Close only the menu, not the drawer around it.
      e.stopPropagation()
      close()
      trigger.current?.focus()
    }
    // The menu is placed once, so it closes instead of drifting when the page scrolls.
    const onMove = (e: Event) => !menu.current?.contains(e.target as Node) && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', close)
    const selected = menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"] button') ?? menu.current?.querySelector<HTMLButtonElement>('button')
    selected?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const moveFocus = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            toggle()
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={cx(
          'inline-flex items-center gap-2 text-sm transition disabled:opacity-50',
          field
            ? cx('h-11 w-full rounded-xl border bg-white pl-3.5 pr-3 text-left font-medium', open ? 'border-ink ring-2 ring-ink/10' : 'border-line hover:border-ink/40')
            : cx('h-10 rounded-full pl-4 pr-3 font-semibold', on ? 'bg-ink text-paper' : 'bg-white text-ink shadow-card hover:bg-sand'),
          className,
        )}
      >
        {shown?.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: shown.color }} />}
        <span className={cx('truncate', field && 'flex-1', !shown && 'text-muted')}>{shown?.label ?? placeholder}</span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.ul
              ref={menu}
              role="listbox"
              aria-label={label}
              onKeyDown={moveFocus}
              initial={{ opacity: 0, y: pos.top !== undefined ? -6 : 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="menu-panel fixed z-[60] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-pop ring-1 ring-ink/5"
              style={pos}
            >
              {options.map((o) => (
                <li key={o.value} role="option" aria-selected={o.value === current?.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      close()
                      trigger.current?.focus()
                    }}
                    className={cx(
                      'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm outline-none hover:bg-sand focus-visible:bg-sand',
                      o.value === current?.value ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {o.color ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.color }} /> : null}
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.value === current?.value && <Check className="h-4 w-4 shrink-0 text-brand" strokeWidth={2.6} />}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label, stretch }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; stretch?: boolean }) {
  return (
    <div className={cx('h-10 items-center rounded-full bg-white p-1 shadow-card', stretch ? 'flex w-full' : 'inline-flex')} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={cx('h-8 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition', stretch && 'flex-1 px-2', o.value === value ? 'bg-ink text-paper' : 'text-muted hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, color, lead, onClick, children }: { active: boolean; color?: string; lead?: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx('inline-flex h-10 items-center gap-1.5 rounded-full pr-4 text-sm font-semibold transition', lead ? 'pl-1.5' : 'pl-4', active ? 'bg-ink text-paper' : 'bg-white text-ink shadow-card hover:bg-sand')}
    >
      {lead}
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

export function Tag({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <button onClick={onRemove} aria-label={`Remove filter ${label}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink pl-3 pr-2 text-[13px] font-semibold text-paper">
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
      <X className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
}
