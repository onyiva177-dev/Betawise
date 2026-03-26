'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBetSlip } from '@/hooks/useBetSlip'

export function BetSlipDrawer() {
  const router = useRouter()
  const {
    selections, stake, isOpen,
    removeSelection, clearSlip, setStake, toggleSlip,
    getTotalOdds, getPotentialWin, getBetType,
  } = useBetSlip()

  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const totalOdds    = getTotalOdds()
  const potentialWin = getPotentialWin()
  const betType      = getBetType()

  async function handlePlaceBet() {
    if (!stake || stake <= 0) { setMessage({ type: 'error', text: 'Enter a stake amount' }); return }
    if (!selections.length)   { setMessage({ type: 'error', text: 'Add selections to your slip' }); return }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, stake }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to place bet' })
        if (data.new_odds) {
          setMessage({ type: 'error', text: `Odds have changed. Please review your slip.` })
        }
        return
      }

      setMessage({ type: 'success', text: `Bet placed! Potential win: KES ${data.potential_win?.toFixed(2)}` })
      clearSlip()
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Mobile overlay backdrop
  const backdrop = isOpen ? (
    <div
      className="fixed inset-0 z-40 bg-black/60 md:hidden"
      onClick={toggleSlip}
    />
  ) : null

  return (
    <>
      {backdrop}

      {/* Mobile floating button */}
      {selections.length > 0 && !isOpen && (
        <button
          onClick={toggleSlip}
          className="fixed bottom-6 right-4 z-50 md:hidden flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-semibold text-sm"
          style={{ background: 'var(--accent-gold)', color: '#07090f' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
          Bet Slip ({selections.length})
        </button>
      )}

      {/* Drawer */}
      <div
        className={`
          fixed z-50 transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 md:bottom-auto md:right-4 md:top-16
          md:w-80 md:max-h-[calc(100vh-5rem)]
          ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0 md:pointer-events-none md:opacity-0'}
        `}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle (mobile) */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <span className="font-display font-bold text-lg text-primary">Bet Slip</span>
            {selections.length > 0 && (
              <span
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: 'var(--accent-gold)', color: '#07090f' }}
              >
                {selections.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selections.length > 0 && (
              <button
                onClick={clearSlip}
                className="text-xs text-secondary hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
            <button onClick={toggleSlip} className="text-secondary hover:text-primary transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Empty state */}
        {selections.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-3xl mb-3">🎯</p>
            <p className="text-secondary text-sm">Click any odds to add to your slip</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Bet type badge */}
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
                style={{
                  background: betType === 'accumulator' ? 'rgba(245,197,24,0.15)' : 'rgba(59,130,246,0.15)',
                  color:      betType === 'accumulator' ? 'var(--accent-gold)' : '#60a5fa',
                }}
              >
                {betType === 'accumulator' ? `Accumulator (${selections.length} legs)` : 'Single Bet'}
              </span>
            </div>

            {/* Selections */}
            <div className="space-y-2">
              {selections.map(sel => (
                <div
                  key={sel.odds_id}
                  className="rounded-lg p-3 flex items-start justify-between gap-2"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-custom truncate">{sel.match_name}</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">{sel.label}</p>
                    <p className="text-xs text-secondary">{sel.market_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display font-bold text-lg text-gold">
                      {sel.decimal_odds.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeSelection(sel.odds_id)}
                      className="text-muted-custom hover:text-red-400 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Stake input */}
            <div>
              <label className="text-xs text-secondary uppercase tracking-wide block mb-1.5">Stake (KES)</label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  value={stake || ''}
                  onChange={e => setStake(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-lg text-primary font-semibold text-lg outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                  }}
                />
              </div>
              {/* Quick stakes */}
              <div className="flex gap-2 mt-2">
                {[50, 100, 200, 500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setStake(amt)}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-elevated)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Total Odds</span>
                <span className="font-display font-bold text-primary">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Stake</span>
                <span className="text-primary">KES {(stake || 0).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 8 }}
                   className="flex justify-between">
                <span className="text-sm font-semibold text-secondary">Potential Win</span>
                <span className="font-display font-bold text-xl text-gold">
                  KES {potentialWin.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className="rounded-lg px-4 py-3 text-sm animate-slide-up"
                style={{
                  background: message.type === 'success' ? 'rgba(0,214,143,0.1)' : 'rgba(255,77,77,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(0,214,143,0.3)' : 'rgba(255,77,77,0.3)'}`,
                  color: message.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}
              >
                {message.text}
              </div>
            )}

            {/* Place bet button */}
            <button
              onClick={handlePlaceBet}
              disabled={loading || !stake}
              className="w-full py-4 rounded-xl font-display font-bold text-xl tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  Placing...
                </span>
              ) : (
                `PLACE BET${stake ? ` · KES ${stake}` : ''}`
              )}
            </button>

            <p className="text-xs text-muted-custom text-center">
              18+ | Bet Responsibly | T&Cs Apply
            </p>
          </div>
        )}
      </div>
    </>
  )
}
