import { LEO, MAYA } from './domain/catalog'
import { cancelBooking, DEFAULT_RULES, insideCutoff, isOpen, setRules } from './domain/rules'
import type { Studio } from './domain/types'

// Ready-made demo situations, opened with ?scenario=<name>. Each one starts from fresh sample data.
export const SCENARIOS: Record<string, (studio: Studio, now: number) => Studio> = {
  // The waitlist rule is "hold it for the front desk" and Maya cancels the class starting soon:
  // a spot is free, Leo is first in line, and nobody has been told.
  'spot-held': (studio, now) => {
    const held = setRules(studio, { ...DEFAULT_RULES, lateSpot: 'hold' })
    const soon = held.sessions.find(
      (s) => isOpen(s, now) && insideCutoff(s, now) && s.booked.includes(MAYA) && s.waitlist[0] === LEO,
    )
    return soon ? cancelBooking(held, soon.id, MAYA, now) : held
  },
}
