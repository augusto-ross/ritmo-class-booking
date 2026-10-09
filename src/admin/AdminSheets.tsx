import { useEffect, useState, type ReactNode } from 'react'
import { Ban, Check, CheckCheck, Clock, MapPin, Pencil, UserPlus, X } from 'lucide-react'
import { DateField, Stepper, TimeField } from '../components/pickers'
import { Avatar, Button, cx, Meter, Select, Sheet } from '../components/ui'
import { CLASS_TYPES, INSTRUCTORS, instructorOf, MEMBERS, memberOf, ROOMS, typeOf } from '../domain/catalog'
import {
  adminAdd,
  adminRemove,
  cancelSession,
  changeInstructor,
  createSessions,
  endOf,
  hasStarted,
  adminPromote,
  freeWindows,
  isOpen,
  suggestStart,
  rulesOf,
  markAllPresent,
  uncheckedIn,
  scheduleClashes,
  setAttendance,
  updateSession,
} from '../domain/rules'
import type { ID, Session, SessionDraft, Studio } from '../domain/types'
import { addDays, fmtDay, fmtTime, fmtWhen, sameDay, startOfDay, toTimeInput } from '../lib/format'
import { useApp, useToasts } from '../store'
import type { Preset } from './parts'
import { RoomDay } from './RoomDay'

export const useAdminActions = () => {
  const apply = useApp((s) => s.apply)
  const restore = useApp((s) => s.restore)
  const push = useToasts((s) => s.push)
  return (fn: (studio: Studio, now: number) => Studio, title: string, body?: string) => {
    const before = useApp.getState().studio
    apply(fn)
    push({ scope: 'admin', tone: 'success', title, body, undo: () => restore(before) })
  }
}

const CANCEL_REASONS = ['Instructor is unwell', 'Room maintenance', 'Not enough bookings']
const TYPE_OPTIONS = CLASS_TYPES.map((t) => ({ value: t.id, label: t.name, color: t.color }))
const INSTRUCTOR_OPTIONS = INSTRUCTORS.map((i) => ({ value: i.id, label: i.name }))
const ROOM_OPTIONS = ROOMS.map((r) => ({ value: r, label: r }))
const REPEAT_OPTIONS = [
  { value: '1', label: 'Just this once' },
  { value: '4', label: 'Weekly for 4 weeks' },
  { value: '8', label: 'Weekly for 8 weeks' },
  { value: '12', label: 'Weekly for 12 weeks' },
]

function Label({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{title}</span>
      {children}
    </div>
  )
}

interface DetailProps {
  session: Session | undefined
  now: number
  onClose: () => void
  onEdit: (id: ID) => void
}

export function AdminSessionSheet({ session, now, onClose, onEdit }: DetailProps) {
  return (
    <Sheet open={!!session} onClose={onClose} label="Class roster" variant="drawer">
      {session && <Detail session={session} now={now} onClose={onClose} onEdit={onEdit} />}
    </Sheet>
  )
}

function Detail({ session, now, onClose, onEdit }: DetailProps & { session: Session }) {
  const act = useAdminActions()
  const apply = useApp((s) => s.apply)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [adding, setAdding] = useState('')
  useEffect(() => setCancelling(false), [session.id])

  const type = typeOf(session.typeId)
  const open = isOpen(session, now)
  const rules = useApp((s) => rulesOf(s.studio))
  const free = isOpen(session, now) ? session.capacity - session.booked.length : 0
  const checkIn = session.status === 'scheduled' && session.start - now <= rules.checkInMinutes * 60000
  const present = session.booked.filter((id) => session.attendance[id] === 'present').length
  const unmarked = session.booked.filter((id) => !session.attendance[id])
  const missing = uncheckedIn(session, now)
  const addable = MEMBERS.filter((m) => !session.booked.includes(m.id) && !session.waitlist.includes(m.id))
  const affected = session.booked.length + session.waitlist.length

  const rosterSection = (
        <section>
          <h3 className="mb-2 flex items-center justify-between text-sm font-bold">
            <span>
              Roster <span className="font-medium text-muted">{session.booked.length}</span>
            </span>
            {checkIn && unmarked.length > 0 && (
              <button
                onClick={() => act((st) => markAllPresent(st, session.id), `${unmarked.length} checked in`, 'Marked as here')}
                className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ok hover:bg-ok-soft"
              >
                <CheckCheck className="h-4 w-4" /> Mark {unmarked.length === session.booked.length ? 'all' : `${unmarked.length} left`} as here
              </button>
            )}
          </h3>
          {missing.length > 0 && (
            <p className="mb-2 rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
              <span className="font-semibold">{missing.length} not checked in.</span> The class is over. Mark who came and who didn't, or they won't count in attendance.
            </p>
          )}
          <ul className="divide-y divide-line rounded-2xl bg-white px-3 shadow-card">
            {session.booked.map((id) => {
              const mark = session.attendance[id]
              return (
                <li key={id} className="flex items-center gap-2.5 py-2">
                  <Avatar name={memberOf(id).name} className="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{memberOf(id).name}</span>
                  {checkIn && (
                    <span className="flex overflow-hidden rounded-full border border-line text-xs font-semibold">
                      <button
                        aria-pressed={mark === 'present'}
                        onClick={() => apply((st) => setAttendance(st, session.id, id, mark === 'present' ? null : 'present'))}
                        className={cx('flex h-8 items-center gap-1 px-2.5', mark === 'present' ? 'bg-ok text-white' : 'hover:bg-sand')}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Here
                      </button>
                      <button
                        aria-pressed={mark === 'absent'}
                        onClick={() => apply((st) => setAttendance(st, session.id, id, mark === 'absent' ? null : 'absent'))}
                        className={cx('h-8 border-l border-line px-2.5', mark === 'absent' ? 'bg-danger text-white' : 'hover:bg-sand')}
                      >
                        No-show
                      </button>
                    </span>
                  )}
                  {open && (
                    <button
                      aria-label={`Remove ${memberOf(id).name}`}
                      onClick={() => act((st, t) => adminRemove(st, session.id, id, t), `${memberOf(id).name} removed`, 'They were notified')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              )
            })}
            {session.booked.length === 0 && <li className="py-4 text-center text-sm text-muted">No bookings yet</li>}
          </ul>
        </section>
  )
  const waitlistSection = session.waitlist.length > 0 && (

          <section>
            <h3 className="mb-2 flex items-center justify-between text-sm font-bold">
              Waitlist <span className="font-medium text-muted">in order</span>
            </h3>
            {free > 0 && (
              <p className="mb-2 rounded-xl bg-ok-soft p-3 text-[13px] text-ok">
                <span className="font-semibold">{free} {free === 1 ? 'spot is' : 'spots are'} free.</span>{' '}
                {rules.lateSpot === 'hold'
                  ? `Held for the front desk: nobody has been told. Give ${free === 1 ? 'it' : 'them'} to anyone waiting.`
                  : `Everyone waiting was alerted and the first to book gets ${free === 1 ? 'it' : 'them'}. You can also give ${free === 1 ? 'it' : 'them'} directly.`}
              </p>
            )}
            <ol className="divide-y divide-line rounded-2xl bg-white px-3 shadow-card">
              {session.waitlist.map((id, i) => (
                <li key={id} className="flex items-center gap-2.5 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warn-soft text-xs font-bold text-warn">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{memberOf(id).name}</span>
                  {free > 0 && (
                    <button
                      onClick={() => act((st, t) => adminPromote(st, session.id, id, t), `${memberOf(id).name} got the spot`, 'They were notified')}
                      className="inline-flex h-8 items-center rounded-full bg-ink px-3 text-xs font-semibold text-paper hover:bg-black"
                    >
                      Give spot
                    </button>
                  )}
                  <button
                    aria-label={`Remove ${memberOf(id).name} from waitlist`}
                    onClick={() => act((st, t) => adminRemove(st, session.id, id, t), `${memberOf(id).name} removed from waitlist`)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          </section>
  )
  // A free spot with people waiting is the thing to act on, so it goes above the roster.
  const spotFirst = free > 0 && session.waitlist.length > 0

  return (
    <>
      <div className="px-5 pb-4 pt-6" style={{ background: type.tint }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: type.color }}>
          {fmtDay(session.start, now)} · {fmtTime(session.start)}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">{type.name}</h2>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink/70">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{session.room}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{session.durationMin} min</span>
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {session.status === 'cancelled' && (
          <p className="rounded-2xl bg-danger-soft p-4 text-sm font-semibold text-danger">
            Cancelled{session.cancelReason && `: ${session.cancelReason}`}
          </p>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold">
              {session.booked.length}
              <span className="text-base font-semibold text-muted">/{session.capacity} booked</span>
            </span>
            <span className="text-sm text-muted">
              {checkIn ? `${present} checked in` : `${session.waitlist.length} waiting`}
            </span>
          </div>
          <Meter value={session.booked.length} max={session.capacity} color={type.color} here={checkIn ? present : undefined} />
        </div>

        {open && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Label title="Instructor">
              <Select
                variant="field"
                label="Instructor"
                value={session.instructorId}
                options={INSTRUCTOR_OPTIONS}
                onChange={(v) =>
                  act(
                    (st, t) => changeInstructor(st, session.id, v, t),
                    'Instructor changed',
                    affected > 0 ? `${affected} ${affected === 1 ? 'member' : 'members'} notified` : undefined,
                  )
                }
              />
            </Label>
            <Button variant="outline" onClick={() => onEdit(session.id)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        )}
        {!open && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Avatar name={instructorOf(session.instructorId).name} src={instructorOf(session.instructorId).photo} className="h-7 w-7 text-[10px]" />
            {instructorOf(session.instructorId).name}
          </p>
        )}

        {spotFirst && waitlistSection}
        {rosterSection}
        {!spotFirst && waitlistSection}


        {session.lateCancels.length > 0 && (
          <p className="text-[13px] text-muted">
            <span className="font-semibold text-ink">Late cancels:</span> {session.lateCancels.map((id) => memberOf(id).name).join(', ')}
          </p>
        )}

        {open && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Label title="Book a member">
              <Select
                variant="field"
                label="Book a member"
                placeholder="Choose a member…"
                value={adding}
                onChange={setAdding}
                options={addable.map((m) => ({ value: m.id, label: m.name }))}
              />
            </Label>
            <Button
              variant="dark"
              disabled={!adding}
              onClick={() => {
                const full = session.booked.length >= session.capacity
                act((st, t) => adminAdd(st, session.id, adding, t), `${memberOf(adding).name} ${full ? 'added to the waitlist' : 'booked'}`)
                setAdding('')
              }}
            >
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-5 pb-6 pt-4">
          {cancelling ? (
            <>
              <p className="text-sm font-semibold">Cancel this class?</p>
              <p className="mt-1 text-[13px] text-muted">
                {affected > 0
                  ? `${affected} ${affected === 1 ? 'member' : 'members'} booked or waiting will be notified right away.`
                  : 'Nobody is booked yet.'}
              </p>
              <div className="mt-3">
                <Select variant="field" label="Reason" value={reason} onChange={setReason} options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setCancelling(false)}>Keep class</Button>
                <Button
                  variant="dark"
                  onClick={() => {
                    act((st, t) => cancelSession(st, session.id, reason, t), 'Class cancelled', affected > 0 ? `${affected} ${affected === 1 ? 'member' : 'members'} notified` : undefined)
                    onClose()
                  }}
                >
                  Cancel class
                </Button>
              </div>
            </>
          ) : (
            <Button variant="danger" className="w-full" onClick={() => setCancelling(true)}>
              <Ban className="h-4 w-4" /> Cancel this class
            </Button>
          )}
        </div>
      )}
    </>
  )
}

const toDateInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface FormProps {
  open: boolean
  editing: Session | undefined
  preset?: Preset
  // Changes on every open, so reopening during the closing animation still starts a fresh form.
  instance?: number
  now: number
  onClose: () => void
}

export function ClassFormSheet({ open, editing, preset, instance, now, onClose }: FormProps) {
  return (
    <Sheet open={open} onClose={onClose} label={editing ? 'Edit class' : 'New class'} variant="drawer">
      {open && <ClassForm key={instance} editing={editing} preset={preset} now={now} onClose={onClose} />}
    </Sheet>
  )
}

function ClassForm({ editing, preset, now, onClose }: Omit<FormProps, 'open'>) {
  const day = preset?.day
  const act = useAdminActions()
  const sessions = useApp((s) => s.studio.sessions)
  const nextHour = `${String(Math.min(21, new Date(now).getHours() + 2)).padStart(2, '0')}:00`
  const [typeId, setTypeId] = useState(editing?.typeId ?? CLASS_TYPES[0].id)
  const [instructorId, setInstructorId] = useState(editing?.instructorId ?? INSTRUCTORS[0].id)
  const [room, setRoom] = useState(editing?.room ?? preset?.room ?? ROOMS[0])
  // Late in the evening today has no room left, so a new class starts on tomorrow instead.
  const [date, setDate] = useState(() => {
    const first = editing?.start ?? day ?? addDays(startOfDay(now), 1)
    const full = !editing && sameDay(first, now) && freeWindows(sessions, room, startOfDay(now), 45, now).length === 0
    return toDateInput(full ? addDays(startOfDay(now), 1) : first)
  })
  const [picked, setPicked] = useState(editing ? toTimeInput(editing.start) : preset?.time)
  const [durationMin, setDurationMin] = useState(editing?.durationMin ?? 45)
  const [capacity, setCapacity] = useState(editing?.capacity ?? 12)
  const [weeks, setWeeks] = useState(1)

  // Until the admin picks a time, suggest one that is free in the chosen room on the chosen day.
  const dayStart = new Date(`${date}T00:00`).getTime()
  const suggested = suggestStart(freeWindows(sessions, room, dayStart, durationMin, now, editing?.id))
  const fallback = sameDay(dayStart, now) ? nextHour : '17:00'
  const time = picked ?? (suggested !== undefined ? toTimeInput(suggested) : fallback)
  const setTime = (t: string) => setPicked(t)
  const start = new Date(`${date}T${time}`).getTime()
  const valid = !Number.isNaN(start) && start > now && capacity > 0 && durationMin > 0
  const tooSmall = !!editing && capacity < editing.booked.length
  const draft: SessionDraft = { typeId, instructorId, room, start, durationMin, capacity }
  const clash: ReturnType<typeof scheduleClashes> = valid ? scheduleClashes(sessions, draft, editing?.id) : { room: undefined, instructor: undefined }

  // Marks times in the picker where the room or the instructor is already taken.
  const slotNote = (t: string) => {
    const at = new Date(`${date}T${t}`).getTime()
    if (at <= now) return 'Past'
    const c = scheduleClashes(sessions, { ...draft, start: at }, editing?.id)
    return c.room ? 'Room taken' : c.instructor ? `${instructorOf(instructorId).name.split(' ')[0]} busy` : undefined
  }

  const submit = () => {
    const name = `${typeOf(typeId).name}, ${fmtWhen(start, now)}`
    if (editing) act((st, t) => updateSession(st, editing.id, draft, t), 'Class updated', name)
    else act((st) => createSessions(st, draft, weeks), weeks > 1 ? `${weeks} classes added` : 'Class added', name)
    onClose()
  }

  return (
    <>
      <div className="px-5 pb-3 pt-6">
        <h2 className="font-display text-2xl font-bold">{editing ? 'Edit class' : 'New class'}</h2>
        <p className="mt-1 text-sm text-muted">
          {editing ? 'Booked members are notified if the time, room or instructor changes.' : 'Members can book as soon as you add it.'}
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-3">
        <Label title="Class">
          <Select variant="field" label="Class" value={typeId} disabled={!!editing} onChange={setTypeId} options={TYPE_OPTIONS} />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label title="Instructor">
            <Select variant="field" label="Instructor" value={instructorId} onChange={setInstructorId} options={INSTRUCTOR_OPTIONS} />
          </Label>
          <Label title="Room">
            <Select variant="field" label="Room" value={room} onChange={setRoom} options={ROOM_OPTIONS} />
          </Label>
          <Label title="Date">
            <DateField label="Date" value={date} min={toDateInput(now)} onChange={setDate} />
          </Label>
          <Label title="Start time">
            <TimeField label="Start time" value={time} onChange={setTime} note={slotNote} />
          </Label>
          <Label title="Duration">
            <Stepper label="Duration" value={durationMin} onChange={setDurationMin} min={15} max={180} step={5} unit="min" />
          </Label>
          <Label title="Capacity">
            <Stepper label="Capacity" value={capacity} onChange={setCapacity} min={1} max={60} unit="spots" />
          </Label>
        </div>
        <RoomDay
          sessions={sessions}
          room={room}
          day={new Date(`${date}T00:00`).getTime()}
          durationMin={durationMin}
          start={start}
          now={now}
          ignoreId={editing?.id}
          onPick={setTime}
        />
        {!editing && (
          <Label title="Repeat">
            <Select variant="field" label="Repeat" value={String(weeks)} onChange={(v) => setWeeks(+v)} options={REPEAT_OPTIONS} />
          </Label>
        )}
        {clash.room && (
          <p className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
            <span className="font-semibold">{room} is taken.</span> {typeOf(clash.room.typeId).name} runs there from {fmtTime(clash.room.start)} to{' '}
            {fmtTime(endOf(clash.room))}.
          </p>
        )}
        {clash.instructor && (
          <p className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
            <span className="font-semibold">{instructorOf(instructorId).name} is already teaching.</span> {typeOf(clash.instructor.typeId).name} from{' '}
            {fmtTime(clash.instructor.start)} to {fmtTime(endOf(clash.instructor))}.
          </p>
        )}
        {tooSmall && (
          <p className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
            {editing!.booked.length} members are already booked. Lowering capacity won't remove anyone, but no new bookings open until it drops below {capacity}.
          </p>
        )}
        {editing && capacity > editing.capacity && editing.waitlist.length > 0 && !hasStarted(editing, now) && (
          <p className="rounded-xl bg-ok-soft p-3 text-[13px] text-ok">
            The extra {capacity - editing.capacity === 1 ? 'spot goes' : 'spots go'} to the waitlist first.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-paper px-5 pb-6 pt-4">
        <Button variant="outline" onClick={onClose}>Discard</Button>
        <Button disabled={!valid} onClick={submit}>{clash.room || clash.instructor ? 'Save anyway' : editing ? 'Save changes' : 'Add class'}</Button>
      </div>
    </>
  )
}
