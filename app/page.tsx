import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { SportsTabs } from '@/components/betting/SportsTabs'
import { MatchCard } from '@/components/betting/MatchCard'
import { BetSlipDrawer } from '@/components/betting/BetSlipDrawer'
import type { Match } from '@/types'

export const revalidate = 30

async function getUpcomingMatches(): Promise<Match[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(`
      *,
      sport:sports(id, name, slug, icon),
      competition:competitions(id, name, country),
      markets(
        id, name, market_key, is_active, is_settled,
        odds(id, selection, label, decimal_odds, is_active, result)
      )
    `)
    .eq('status', 'upcoming')
    .eq('betting_closed', false)
    .order('scheduled_at', { ascending: true })
    .limit(80)
  return (data ?? []) as Match[]
}

async function getSports() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sports')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const [matches, sports, params] = await Promise.all([
    getUpcomingMatches(),
    getSports(),
    searchParams,
  ])

  const activeSport = params.sport || 'all'
  const filtered = activeSport === 'all'
    ? matches
    : matches.filter(m => m.sport?.slug === activeSport)

  return (
    <div className="min-h-screen bg-base">
      <Header />

      <main className="max-w-7xl mx-auto px-4 pb-24">
        {/* Hero Banner */}
        <div className="py-6">
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0d1120 0%, #131929 50%, #0a0e1a 100%)',
              border: '1px solid #1e2640',
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 70% 50%, #f5c518 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10">
              <p className="text-xs text-secondary uppercase tracking-widest mb-1">Welcome to</p>
              <h1 className="font-display text-5xl md:text-6xl font-extrabold text-primary leading-none">
                BETA<span className="text-gold">WISE</span>
              </h1>
              <p className="text-secondary mt-2 text-sm">
                Pre-match betting · Football · Rugby · Athletics
              </p>
            </div>
          </div>
        </div>

        <SportsTabs sports={sports} active={activeSport} />

        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="panel p-12 text-center">
              <p className="text-4xl mb-3">🏟️</p>
              <p className="text-secondary">No upcoming matches for this sport.</p>
              <p className="text-muted-custom text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            filtered.map(match => (
              <MatchCard key={match.id} match={match} />
            ))
          )}
        </div>
      </main>

      <BetSlipDrawer />
    </div>
  )
}
