import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Columns2, MonitorSmartphone, RotateCcw } from 'lucide-react'
import { AdminApp } from './admin/AdminApp'
import { Avatar, cx, Logo } from './components/ui'
import { LEO, MAYA, memberOf, SAM } from './domain/catalog'
import { MemberApp } from './member/MemberApp'
import { dueReminders } from './domain/rules'
import { SCENARIOS } from './scenarios'
import { useApp, type MemberId } from './store'

const PROFILES = [
  { id: MAYA, to: '/app', name: 'Maya', role: 'Member', blurb: 'Has a weekly routine and a class booked for tomorrow.' },
  { id: LEO, to: '/app', name: 'Leo', role: 'Member', blurb: "First in line on the waitlist for Maya's class." },
  { id: SAM, to: '/app', name: 'Sam', role: 'New member', blurb: 'Joined this week. Nothing booked, no routine yet.' },
  { id: 'admin', to: '/admin', name: 'Carla', role: 'Studio admin', blurb: 'Runs the front desk: schedule, rosters and check-in.' },
] as const

const TITLES: Record<string, string> = {
  '/app': 'Ritmo · Book your classes',
  '/admin': 'Ritmo · Studio admin',
  '/demo': 'Ritmo · Side by side',
}

// The browser tab says which side of the product is open.
function useTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = TITLES[pathname] ?? 'Ritmo · Your studio, in your pocket'
  }, [pathname])
}

export function App() {
  useScenario()
  useReminderClock()
  useTitle()
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Shell><MemberRoute /></Shell>} />
      <Route path="/admin" element={<Shell><AdminApp /></Shell>} />
      <Route path="/demo" element={<Shell><SideBySide /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function useEnter() {
  const navigate = useNavigate()
  const setMember = useApp((s) => s.setMember)
  return (id: (typeof PROFILES)[number]['id']) => {
    if (id !== 'admin') setMember(id as MemberId)
    navigate(id === 'admin' ? '/admin' : '/app')
  }
}

function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const member = useApp((s) => s.member)
  const reset = useApp((s) => s.reset)
  const enter = useEnter()
  const current = pathname === '/admin' ? 'admin' : pathname === '/app' ? member : null

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 bg-ink px-3 text-[13px] text-paper">
        <Link to="/" className="rounded bg-brand-bright px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink">
          Demo
        </Link>
        <span className="hidden text-paper/55 sm:inline">Viewing as</span>
        <div className="flex rounded-full bg-white/10 p-0.5" role="group" aria-label="Switch profile">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => enter(p.id)}
              aria-pressed={current === p.id}
              className={cx('rounded-full px-3 py-1 font-semibold transition', current === p.id ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper')}
            >
              {p.name}
              <span className="hidden font-normal opacity-60 md:inline"> · {p.role}</span>
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <Link
          to="/demo"
          className={cx('hidden items-center gap-1.5 rounded-full px-3 py-1 font-semibold lg:inline-flex', pathname === '/demo' ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper')}
        >
          <Columns2 className="h-4 w-4" /> Side by side
        </Link>
        <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold text-paper/70 hover:text-paper" title="Restore the sample data">
          <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Reset demo</span>
        </button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function MemberRoute() {
  const member = useApp((s) => s.member)
  return (
    <div className="flex h-full justify-center bg-sand">
      <div className="h-full w-full max-w-[460px] border-line shadow-card sm:border-x">
        <MemberApp memberId={member} />
      </div>
    </div>
  )
}

function SideBySide() {
  const member = useApp((s) => s.member)
  const setMember = useApp((s) => s.setMember)
  return (
    <>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center lg:hidden">
        <MonitorSmartphone className="h-8 w-8 text-ink/40" />
        <p className="font-display text-xl font-bold">Side by side needs a wider screen</p>
        <p className="max-w-xs text-sm text-muted">Use the profile switcher above to move between the member app and the admin panel.</p>
      </div>
      <div className="hidden h-full gap-6 p-6 lg:flex">
        <div className="flex h-full w-[390px] shrink-0 flex-col items-center gap-3">
          <div className="flex rounded-full bg-white p-1 shadow-card" role="group" aria-label="Member on the phone">
            {([MAYA, LEO, SAM] as MemberId[]).map((id) => (
              <button
                key={id}
                onClick={() => setMember(id)}
                aria-pressed={member === id}
                className={cx('rounded-full px-4 py-1.5 text-sm font-semibold transition', member === id ? 'bg-ink text-paper' : 'text-muted hover:text-ink')}
              >
                {memberOf(id).name}
              </button>
            ))}
          </div>
          <div className="min-h-0 w-full max-h-[860px] flex-1 overflow-hidden rounded-[44px] border-[10px] border-ink bg-ink shadow-pop">
            <div className="h-full overflow-hidden rounded-[34px]">
              <MemberApp memberId={member} />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line bg-sand/60 px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-xs text-muted">ritmo.studio/admin</span>
          </div>
          <div className="min-h-0 flex-1">
            <AdminApp />
          </div>
        </div>
      </div>
    </>
  )
}

function Landing() {
  const enter = useEnter()
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-8">
        <Logo className="text-3xl" />
        <div className="flex flex-1 flex-col justify-center py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Class booking for Ritmo Studio</p>
          <h1 className="mt-3 max-w-2xl font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
            Find your class. Keep your rhythm.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Members book, cancel and join waitlists on their own. Freed spots fill themselves, and the front desk sees every class at a glance.
          </p>

          <p className="mt-10 text-sm font-semibold">Continue as</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => enter(p.id)}
                className="group flex flex-col rounded-3xl bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.id === 'admin' ? 'Carla Mendes' : memberOf(p.id).name} className={cx('h-11 w-11 text-sm', p.id === 'admin' && 'bg-ink text-paper')} />
                  <div>
                    <p className="font-display text-lg font-bold leading-tight">{p.name}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{p.role}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{p.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                  Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
          <Link to="/demo" className="mt-5 hidden items-center gap-2 self-start text-sm font-semibold text-ink underline-offset-4 hover:underline lg:inline-flex">
            <Columns2 className="h-4 w-4" /> Or watch both sides at once
          </Link>
        </div>
        <p className="text-xs text-muted">Prototype with sample data. Nothing is sent and changes stay in this browser.</p>
      </div>
    </div>
  )
}

// Applies ?scenario=<name> once on load, then drops it from the URL so a refresh keeps the user's changes.
function useScenario() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  useEffect(() => {
    const name = new URLSearchParams(search).get('scenario')
    if (!name) return
    const scenario = SCENARIOS[name]
    if (scenario) {
      useApp.getState().reset()
      useApp.getState().apply(scenario)
    }
    navigate(pathname, { replace: true })
  }, [search, pathname, navigate])
}

// Sends reminders that are due: right after any change (a booking, a spot given, a new reminder
// setting) and every 30 seconds as time passes. dueReminders returns the same object when there is
// nothing to send, so the subscription settles after one pass.
function useReminderClock() {
  useEffect(() => {
    const tick = () => {
      const { studio, restore } = useApp.getState()
      const next = dueReminders(studio, Date.now())
      if (next !== studio) restore(next)
    }
    tick()
    const t = setInterval(tick, 30000)
    const stop = useApp.subscribe((state, prev) => {
      if (state.studio !== prev.studio) tick()
    })
    return () => {
      clearInterval(t)
      stop()
    }
  }, [])
}
