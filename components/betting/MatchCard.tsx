'use client'
import { useState } from 'react'
import type { Match, Odds } from '@/types'
import { useBetSlip } from '@/hooks/useBetSlip'

interface MatchCardProps {
  match: Match
}

export function MatchCard({ match }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { addSelection, removeSelection, hasSelection } = useBetSlip()

  const primaryMarket = match.markets?.find(m => m.market_key === 'match_winner' || m.market_key === 'winner')
    ?? match.markets?.[0]

  const otherMarkets = match.markets?.filter(m => m.id !== primaryMarket?.id) ?? []

  function handleOddsClick(odds: Odds, marketName: string) {
    if (hasSelection(odds.id)) {
      removeSelection(odds.id)
      return
    }
    addSelection({
      match_id:    match.id,
      market_id:   odds.market_id,
      odds_id:     odds.id,
      selection:   odds.selection,
      label:       odds.label,
      decimal_odds: odds.decimal_odds,
      match_name:  `${match.home_team}${match.away_team ? ` vs ${match.away_team}` : ''}`,
      market_name: marketName,
      sport_slug:  match.sport?.slug ?? 'football',
    })
  }

  const scheduledDate = new Date(match.scheduled_at)
  const dateStr = scheduledDate.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = scheduledDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="panel overflow-hidden transition-all duration-200 hover:border-[#2a3350]"
      style={{ borderRadius: 12 }}
    >
      {/* Match header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-lg">{match.sport?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-custom truncate">{match.competition?.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="font-display font-bold text-lg text-primary leading-tight truncate"
            >
              {match.home_team}
              {match.away_team && (
                <span className="text-muted-custom font-normal"> vs </span>
              )}
              {match.away_team}
            </span>
          </div>
          {match.description && (
            <p className="text-xs text-secondary mt-0.5">{match.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-custom">{dateStr}</p>
          <p className="text-sm font-semibold text-secondary">{timeStr}</p>
        </div>
      </div>

      {/* Primary market odds */}
      {primaryMarket && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-custom mb-2 uppercase tracking-wide">{primaryMarket.name}</p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${primaryMarket.odds?.length ?? 3}, 1fr)` }}
          >
            {primaryMarket.odds?.map(odds => (
              <button
                key={odds.id}
                className={`odds-btn px-3 py-2.5 text-center ${hasSelection(odds.id) ? 'selected' : ''}`}
                onClick={() => handleOddsClick(odds, primaryMarket.name)}
              >
                <p className="text-xs text-secondary mb-0.5">{odds.label}</p>
                <p className={`odds-value font-display font-bold text-lg ${hasSelection(odds.id) ? 'text-gold' : 'text-primary'}`}>
                  {odds.decimal_odds.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* More markets toggle */}
      {otherMarkets.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1"
            style={{ borderTop: '1px solid #1e2640' }}
          >
            <span>+{otherMarkets.reduce((a, m) => a + (m.odds?.length ?? 0), 0)} more markets</span>
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {expanded && (
            <div className="px-4 pb-3 space-y-3 animate-slide-up">
              {otherMarkets.map(market => (
                <div key={market.id}>
                  <p className="text-xs text-muted-custom mb-2 uppercase tracking-wide">{market.name}</p>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${Math.min(market.odds?.length ?? 2, 4)}, 1fr)` }}
                  >
                    {market.odds?.map(odds => (
                      <button
                        key={odds.id}
                        className={`odds-btn px-3 py-2.5 text-center ${hasSelection(odds.id) ? 'selected' : ''}`}
                        onClick={() => handleOddsClick(odds, market.name)}
                      >
                        <p className="text-xs text-secondary mb-0.5">{odds.label}</p>
                        <p className={`odds-value font-display font-bold text-lg ${hasSelection(odds.id) ? 'text-gold' : 'text-primary'}`}>
                          {odds.decimal_odds.toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
