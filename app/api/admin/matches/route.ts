import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) return null
  return user
}

// GET /api/admin/matches — list all matches for admin
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'upcoming'

  const query = supabase
    .from('matches')
    .select(`
      *,
      sport:sports(id, name, slug, icon),
      competition:competitions(id, name),
      markets(id, name, market_key, is_active, is_settled,
        odds(id, selection, label, decimal_odds, is_active, result))
    `)
    .order('scheduled_at', { ascending: false })
    .limit(100)

  const { data, error } = status === 'all' ? await query : await query.eq('status', status)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data })
}

// PATCH /api/admin/matches — set result and settle bets
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { match_id, home_score, away_score, result_notes, odds_results } = await req.json()
  // odds_results: [{ odds_id: string, result: 'won'|'lost'|'void' }]

  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

  // Update match to finished
  const { error: matchErr } = await supabase
    .from('matches')
    .update({
      status:        'finished',
      home_score:    home_score ?? 0,
      away_score:    away_score ?? 0,
      result_notes,
      betting_closed: true,
    })
    .eq('id', match_id)

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })

  // Update each odds with its result
  if (odds_results?.length) {
    for (const { odds_id, result } of odds_results) {
      await supabase
        .from('odds')
        .update({ result, is_active: false })
        .eq('id', odds_id)
    }

    // Get all market IDs from those odds
    const { data: oddsRows } = await supabase
      .from('odds')
      .select('market_id')
      .in('id', odds_results.map((o: { odds_id: string }) => o.odds_id))

    const marketIds = [...new Set(oddsRows?.map(o => o.market_id) ?? [])]
    if (marketIds.length) {
      await supabase.from('markets').update({ is_settled: true }).in('id', marketIds)
    }

    // Update bet_selections statuses
    for (const { odds_id, result } of odds_results) {
      await supabase
        .from('bet_selections')
        .update({ status: result })
        .eq('odds_id', odds_id)
        .eq('status', 'pending')
    }

    // Find all bets that have selections on this match
    const { data: affectedSelections } = await supabase
      .from('bet_selections')
      .select('bet_id')
      .eq('match_id', match_id)

    const betIds = [...new Set(affectedSelections?.map(s => s.bet_id) ?? [])]

    // Settle each bet — only if all its selections are now resolved
    for (const betId of betIds) {
      // Check if this bet still has any pending selections
      const { data: pendingSelections } = await supabase
        .from('bet_selections')
        .select('id')
        .eq('bet_id', betId)
        .eq('status', 'pending')

      if (pendingSelections?.length === 0) {
        const { data: settleResult } = await supabase.rpc('settle_bet', { p_bet_id: betId })
        if (settleResult && !settleResult.success) {
          console.error(`Failed to settle bet ${betId}:`, settleResult.error)
        }
      }
    }
  }

  return NextResponse.json({ success: true, settled_bets: odds_results?.length > 0 })
}
