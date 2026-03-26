'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface OddsRow {
  id: string
  selection: string
  label: string
  decimal_odds: number
  market_id: string
  market_name: string
  market_key: string
}

interface ResultSetterProps {
  matchId: string
  matchName: string
  onClose: () => void
}

export function AdminResultSetter({ matchId, matchName, onClose }: ResultSetterProps) {
  const router = useRouter()
  const [odds, setOdds]           = useState<OddsRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [results, setResults]     = useState<Record<string, 'won' | 'lost' | 'void'>>({})
  const [step, setStep]           = useState<'scores' | 'confirm'>('scores')

  useEffect(() => {
    const sb = createClient()
    sb.from('markets')
      .select('id, name, market_key, odds(id, selection, label, decimal_odds)')
      .eq('match_id', matchId)
      .eq('is_active', true)
      .then(({ data }) => {
        const flat: OddsRow[] = []
        data?.forEach(m => {
          const ods = m.odds as Array<{ id: string; selection: string; label: string; decimal_odds: number }>
          ods?.forEach(o => flat.push({ ...o, market_id: m.id, market_name: m.name, market_key: m.market_key }))
        })
        setOdds(flat)
        setLoading(false)
      })
  }, [matchId])

  function deriveResults() {
    const d: Record<string, 'won' | 'lost' | 'void'> = {}
    const total = homeScore + awayScore
    odds.forEach(o => {
      switch (o.market_key) {
        case 'match_winner': {
          const w = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
          d[o.id] = o.selection === w ? 'won' : 'lost'; break
        }
        case 'over_under_2.5': {
          const over = total > 2.5
          d[o.id] = (o.selection === 'over' && over) || (o.selection === 'under' && !over) ? 'won' : 'lost'; break
        }
        case 'over_under_1.5': {
          const over = total > 1.5
          d[o.id] = (o.selection === 'over' && over) || (o.selection === 'under' && !over) ? 'won' : 'lost'; break
        }
        case 'btts': {
          const btts = homeScore > 0 && awayScore > 0
          d[o.id] = (o.selection === 'yes' && btts) || (o.selection === 'no' && !btts) ? 'won' : 'lost'; break
        }
        default: d[o.id] = 'void'
      }
    })
    setResults(d)
    setStep('confirm')
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id:    matchId,
          home_score:  homeScore,
          away_score:  awayScore,
          odds_results: Object.entries(results).map(([odds_id, result]) => ({ odds_id, result })),
        }),
      })
      if (res.ok) { onClose(); router.refresh() }
    } finally { setSaving(false) }
  }

  const RC = {
    won:  { bg: 'rgba(0,214,143,0.1)', border: 'rgba(0,214,143,0.3)', text: 'var(--accent-green)' },
    lost: { bg: 'rgba(255,77,77,0.1)', border: 'rgba(255,77,77,0.3)', text: 'var(--accent-red)'   },
    void: { bg: 'rgba(74,85,120,0.2)', border: 'rgba(74,85,120,0.4)', text: 'var(--text-muted)'   },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-slide-up"
           style={{ background:'var(--bg-surface)', border:'1px solid var(--bg-border)', maxHeight:'90vh', overflowY:'auto' }}>

        <div className="px-6 py-4 flex items-center justify-between"
             style={{ borderBottom:'1px solid var(--bg-border)' }}>
          <div>
            <h2 className="font-display font-bold text-xl text-primary">Set Match Result</h2>
            <p className="text-sm text-secondary mt-0.5">{matchName}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-secondary">Loading markets...</div>
        ) : step === 'scores' ? (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs text-muted-custom uppercase tracking-wide mb-4">Final Score</p>
              <div className="flex items-center justify-center gap-8">
                {[
                  { label:'Home', score:homeScore, set:setHomeScore },
                  { label:'Away', score:awayScore, set:setAwayScore },
                ].map((s, i) => (
                  <div key={s.label} className="text-center">
                    {i === 1 && (
                      <div className="absolute font-display font-bold text-3xl text-muted-custom"
                           style={{ transform:'translate(-2rem, 1.5rem)' }}>–</div>
                    )}
                    <p className="text-xs text-secondary mb-3">{s.label}</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => s.set(n => Math.max(0, n - 1))}
                        className="w-10 h-10 rounded-full text-xl font-bold"
                        style={{ background:'var(--bg-elevated)', color:'var(--text-secondary)' }}>−</button>
                      <span className="font-display font-bold text-5xl text-primary w-12 text-center">{s.score}</span>
                      <button onClick={() => s.set(n => n + 1)}
                        className="w-10 h-10 rounded-full text-xl font-bold"
                        style={{ background:'var(--accent-gold)', color:'#07090f' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center font-display font-bold text-4xl text-primary mt-4">
                {homeScore} – {awayScore}
              </p>
            </div>

            <div className="rounded-xl p-4" style={{ background:'var(--bg-elevated)' }}>
              <p className="text-xs text-muted-custom mb-1">Auto-derived outcome</p>
              <p className="font-semibold text-primary">
                {homeScore > awayScore ? '🏠 Home Win' : homeScore < awayScore ? '✈️ Away Win' : '🤝 Draw'}
                <span className="text-secondary font-normal">
                  {' · '}{homeScore + awayScore > 2.5 ? 'Over 2.5' : 'Under 2.5'}
                  {' · '}BTTS: {homeScore > 0 && awayScore > 0 ? 'Yes' : 'No'}
                </span>
              </p>
            </div>

            <button onClick={deriveResults}
              className="w-full py-3 rounded-xl font-display font-bold text-lg"
              style={{ background:'linear-gradient(135deg,#f5c518,#e8a000)', color:'#07090f' }}>
              Calculate Results →
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="rounded-xl p-3 flex items-center justify-between"
                 style={{ background:'var(--bg-elevated)' }}>
              <span className="text-secondary text-sm">Final Score</span>
              <span className="font-display font-bold text-2xl text-gold">{homeScore} – {awayScore}</span>
            </div>

            <div>
              <p className="text-xs text-muted-custom uppercase tracking-wide mb-3">Review & Adjust Results</p>
              <div className="space-y-4">
                {Array.from(new Set(odds.map(o => o.market_id))).map(mid => {
                  const mOdds = odds.filter(o => o.market_id === mid)
                  return (
                    <div key={mid}>
                      <p className="text-xs text-secondary mb-2 font-semibold">{mOdds[0]?.market_name}</p>
                      <div className="space-y-1.5">
                        {mOdds.map(o => {
                          const r = results[o.id] ?? 'void'
                          return (
                            <div key={o.id} className="flex items-center gap-3">
                              <div className="flex-1 flex items-center justify-between rounded-lg px-3 py-2"
                                   style={{ background:RC[r].bg, border:`1px solid ${RC[r].border}` }}>
                                <span className="text-sm text-primary">{o.label}</span>
                                <span className="font-display font-bold text-sm" style={{ color:RC[r].text }}>
                                  {o.decimal_odds.toFixed(2)}x
                                </span>
                              </div>
                              <div className="flex gap-1">
                                {(['won','lost','void'] as const).map(res => (
                                  <button key={res}
                                    onClick={() => setResults(p => ({ ...p, [o.id]: res }))}
                                    className="px-2 py-1 rounded text-xs font-bold"
                                    style={results[o.id] === res
                                      ? { background:RC[res].bg, border:`1px solid ${RC[res].border}`, color:RC[res].text }
                                      : { background:'var(--bg-elevated)', color:'var(--text-muted)', border:'1px solid var(--bg-border)' }}>
                                    {res === 'won' ? 'W' : res === 'lost' ? 'L' : 'V'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('scores')}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background:'var(--bg-elevated)', color:'var(--text-secondary)' }}>
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-3 rounded-xl font-display font-bold text-lg disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#00d68f,#00b37a)', color:'#07090f' }}>
                {saving ? 'Settling...' : '✓ Confirm & Settle'}
              </button>
            </div>
            <p className="text-xs text-muted-custom text-center">
              This pays out all winning bets instantly via the DB atomic function.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
