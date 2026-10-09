import type { ClassType, Instructor, Member } from './types'

export const CLASS_TYPES: ClassType[] = [
  { id: 'spin', image: '/img/spin.jpg', name: 'Spinning', color: '#B45309', tint: '#FCEFD6', blurb: 'High-energy indoor cycling set to music. All levels, bring water.' },
  { id: 'pilates', image: '/img/pilates.jpg', name: 'Pilates', color: '#0F766E', tint: '#DDF1EC', blurb: 'Mat-based core strength, posture and control at a steady pace.' },
  { id: 'muay', image: '/img/muay.jpg', name: 'Muay Thai', color: '#BE123C', tint: '#FBE1E6', blurb: 'Technique, pad work and conditioning. Gloves available at the front desk.' },
  { id: 'yoga', image: '/img/yoga.jpg', name: 'Yoga Flow', color: '#6D28D9', tint: '#EBE3FB', blurb: 'Vinyasa flow linking breath and movement. Mats provided.' },
  { id: 'hiit', image: '/img/hiit.jpg', name: 'HIIT', color: '#1D4ED8', tint: '#DEE8FC', blurb: 'Short, intense intervals for strength and cardio. Scales to your level.' },
]

export const INSTRUCTORS: Instructor[] = [
  { id: 'ana', name: 'Ana Reyes', photo: '/img/instructors/ana.webp' },
  { id: 'bea', name: 'Bea Moreau', photo: '/img/instructors/bea.webp' },
  { id: 'tom', name: 'Tom Okafor', photo: '/img/instructors/tom.webp' },
  { id: 'kai', name: 'Kai Tanaka' },
  { id: 'lena', name: 'Lena Fischer', photo: '/img/instructors/lena.webp' },
  { id: 'rafa', name: 'Rafa Costa', photo: '/img/instructors/rafa.webp' },
]

export const ROOMS = ['Cycle Room', 'Studio A', 'Studio B', 'Dojo']

const OTHER_NAMES = [
  'Noah Bennett', 'Priya Shah', 'Lucas Almeida', 'Emma Clarke', 'Diego Ramos', 'Sofia Rossi',
  'Ethan Brooks', 'Chloe Martin', 'Omar Haddad', 'Julia Santos', 'Ben Carter', 'Hana Kim',
  'Marco Bianchi', 'Isla Murphy', 'Theo Laurent', 'Nina Petrova', 'Sam Whitaker', 'Alice Duarte',
  'Jonas Weber', 'Carmen Vega', 'Felix Nguyen', 'Olivia Hart',
]

// More members so each one books a realistic three or four classes a week.
const FIRST = ['Ava', 'Mateo', 'Grace', 'Ravi', 'Lena', 'Hugo', 'Mia', 'Tomas', 'Zoe', 'Ivan', 'Lucia', 'Kenji', 'Elena', 'Paulo', 'Ruth', 'Sami', 'Clara', 'Nico', 'Iris', 'Bruno']
const LAST = ['Silva', 'Fischer', 'Okoro', 'Lindqvist', 'Moreno', 'Tanaka', 'Dubois', 'Costa', 'Novak', 'Patel', 'Ward', 'Ferreira', 'Kowalski', 'Ahmed', 'Russo', 'Berg', 'Lopez', 'Quinn']
const EXTRA_NAMES = Array.from({ length: 68 }, (_, i) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`).filter(
  (name, i, all) => all.indexOf(name) === i && !OTHER_NAMES.includes(name),
)

export const MAYA = 'maya'
export const LEO = 'leo'
// Joined this week: no bookings, no favourites yet.
export const SAM = 'sam'

export const MEMBERS: Member[] = [
  { id: MAYA, name: 'Maya Torres', email: 'maya.torres@example.com' },
  { id: LEO, name: 'Leo Park', email: 'leo.park@example.com' },
  { id: SAM, name: 'Sam Rivera', email: 'sam.rivera@example.com', isNew: true },
  ...[...OTHER_NAMES, ...EXTRA_NAMES].map((name, i) => ({
    id: `m${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  })),
]

const index = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x]))
const types = index(CLASS_TYPES)
const instructors = index(INSTRUCTORS)
const members = index(MEMBERS)

export const typeOf = (id: string): ClassType => types[id]
export const instructorOf = (id: string): Instructor => instructors[id]
export const memberOf = (id: string): Member => members[id]
export const firstName = (id: string) => memberOf(id).name.split(' ')[0]
export const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2)
