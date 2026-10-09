import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAYA } from './domain/catalog'
import { buildStudio } from './domain/seed'
import type { Studio } from './domain/types'
import { dayKey } from './lib/format'

export type Scope = 'maya' | 'leo' | 'sam' | 'admin'
export type MemberId = 'maya' | 'leo' | 'sam'

// What each class block shows on the admin calendar.
export interface CalendarShow {
  instructor: boolean
  room: boolean
  bookings: boolean
}

interface AppState {
  studio: Studio
  seededOn: string
  member: MemberId
  // Admin suggestions the front desk has closed, as "sessionId:kind".
  dismissed: string[]
  calendarShow: CalendarShow
  apply: (fn: (studio: Studio, now: number) => Studio) => void
  restore: (studio: Studio) => void
  setMember: (member: MemberId) => void
  setDismissed: (dismissed: string[]) => void
  setCalendarShow: (calendarShow: CalendarShow) => void
  reset: () => void
}

const fresh = () => ({ studio: buildStudio(Date.now()), seededOn: dayKey(Date.now()) })

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...fresh(),
      member: MAYA,
      dismissed: [],
      calendarShow: { instructor: false, room: true, bookings: true },
      apply: (fn) => set((state) => ({ studio: fn(state.studio, Date.now()) })),
      restore: (studio) => set({ studio }),
      setMember: (member) => set({ member }),
      setDismissed: (dismissed) => set({ dismissed }),
      setCalendarShow: (calendarShow) => set({ calendarShow }),
      reset: () => set({ ...fresh(), dismissed: [] }),
    }),
    {
      name: 'ritmo-demo-v8',
      // The schedule is seeded around "today", so yesterday's saved state would look stale.
      onRehydrateStorage: () => (state) => {
        if (state && state.seededOn !== dayKey(Date.now())) state.reset()
      },
    },
  ),
)

export interface Toast {
  id: number
  scope: Scope
  tone: 'success' | 'info' | 'alert'
  title: string
  body?: string
  undo?: () => void
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let toastId = 0

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.scope !== toast.scope).slice(-2), { ...toast, id }] }))
    setTimeout(() => get().dismiss(id), toast.undo ? 6000 : 4500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
