import { create } from 'zustand'
import { listOwnerVenues } from '../services/ownerApi'
import type { Venue } from '../types/owner'

function todayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface OwnerState {
  venue: Venue | null
  selectedDate: string
  loading: boolean
  error: string | null
  setSelectedDate: (date: string) => void
  loadVenue: () => Promise<void>
}

export const useOwnerStore = create<OwnerState>((set, get) => ({
  venue: null,
  selectedDate: todayLocal(),
  loading: false,
  error: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  loadVenue: async () => {
    if (get().venue || get().loading) return
    set({ loading: true, error: null })
    try {
      const venues = await listOwnerVenues()
      set({ venue: venues[0] ?? null, loading: false })
    } catch {
      set({ loading: false, error: 'Could not load your venue.' })
    }
  },
}))
