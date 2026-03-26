'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BetSlipSelection } from '@/types'

interface BetSlipState {
  selections: BetSlipSelection[]
  stake: number
  isOpen: boolean

  addSelection: (sel: BetSlipSelection) => void
  removeSelection: (oddsId: string) => void
  hasSelection: (oddsId: string) => boolean
  clearSlip: () => void
  setStake: (amount: number) => void
  toggleSlip: () => void
  openSlip: () => void

  getTotalOdds: () => number
  getPotentialWin: () => number
  getBetType: () => 'single' | 'accumulator'
}

export const useBetSlip = create<BetSlipState>()(
  persist(
    (set, get) => ({
      selections: [],
      stake: 0,
      isOpen: false,

      addSelection: (sel) => {
        const existing = get().selections
        // One selection per match
        const filtered = existing.filter(s => s.match_id !== sel.match_id)
        set({ selections: [...filtered, sel], isOpen: true })
      },

      removeSelection: (oddsId) => {
        set(s => ({ selections: s.selections.filter(sel => sel.odds_id !== oddsId) }))
      },

      hasSelection: (oddsId) => get().selections.some(s => s.odds_id === oddsId),

      clearSlip: () => set({ selections: [], stake: 0 }),

      setStake: (amount) => set({ stake: Math.max(0, amount) }),

      toggleSlip: () => set(s => ({ isOpen: !s.isOpen })),

      openSlip: () => set({ isOpen: true }),

      getTotalOdds: () => {
        const { selections } = get()
        if (selections.length === 0) return 0
        return parseFloat(
          selections.reduce((acc, s) => acc * s.decimal_odds, 1).toFixed(3)
        )
      },

      getPotentialWin: () => {
        const { stake } = get()
        const odds = get().getTotalOdds()
        if (!stake || !odds) return 0
        return parseFloat((stake * odds).toFixed(2))
      },

      getBetType: () => {
        return get().selections.length === 1 ? 'single' : 'accumulator'
      },
    }),
    {
      name: 'betawise-slip',
      partialise: (s) => ({ selections: s.selections, stake: s.stake }),
    }
  )
)
