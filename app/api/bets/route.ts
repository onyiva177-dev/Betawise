import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BetSlipSelection } from '@/types'

const MIN_STAKE = 10    // KES
const MAX_STAKE = 100000
const MAX_WIN   = 1000000
const MAX_SELECTIONS = 20
const MAX_ACCA_ODDS  = 10000

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check suspension
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended, fraud_flags')
      .eq('id', user.id)
      .single()

    if (profile?.is_suspended) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    const body = await req.json()
    const { selections, stake }: { selections: BetSlipSelection[]; stake: number } = body

    // ── Validation ─────────────────────────────────────
    if (!selections?.length) return NextResponse.json({ error: 'No selections' }, { status: 400 })
    if (selections.length > MAX_SELECTIONS) return NextResponse.json({ error: 'Too many selections' }, { status: 400 })
    if (!stake || stake < MIN_STAKE) return NextResponse.json({ error: `Minimum stake is KES ${MIN_STAKE}` }, { status: 400 })
    if (stake > MAX_STAKE) return NextResponse.json({ error: `Maximum stake is KES ${MAX_STAKE}` }, { status: 400 })

    // Check for duplicate matches (already enforced on client, double-check server)
    const matchIds = selections.map(s => s.match_id)
    if (new Set(matchIds).size !== matchIds.length) {
      return NextResponse.json({ error: 'Duplicate match in selections' }, { status: 400 })
    }

    // Check all matches are still upcoming and not closed
    const { data: matches } = await supabase
      .from('matches')
      .select('id, status, betting_closed, scheduled_at')
      .in('id', matchIds)

    for (const sel of selections) {
      const match = matches?.find(m => m.id === sel.match_id)
      if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 400 })
      if (match.status !== 'upcoming') return NextResponse.json({ error: `Match is not available for betting` }, { status: 400 })
      if (match.betting_closed) return NextResponse.json({ error: 'Betting closed for this match' }, { status: 400 })
      if (new Date(match.scheduled_at) < new Date()) {
        return NextResponse.json({ error: 'Match has already started' }, { status: 400 })
      }
    }

    // Calculate total odds
    const totalOdds = parseFloat(
      selections.reduce((acc, s) => acc * s.decimal_odds, 1).toFixed(3)
    )

    if (totalOdds > MAX_ACCA_ODDS) {
      return NextResponse.json({ error: `Maximum accumulator odds is ${MAX_ACCA_ODDS}` }, { status: 400 })
    }

    const potentialWin = parseFloat((stake * totalOdds).toFixed(2))
    if (potentialWin > MAX_WIN) {
      return NextResponse.json({ error: `Maximum win is KES ${MAX_WIN.toLocaleString()}` }, { status: 400 })
    }

    const betType = selections.length === 1 ? 'single' : 'accumulator'

    // Call atomic DB function
    const { data: result, error } = await supabase.rpc('place_bet', {
      p_user_id:    user.id,
      p_stake:      stake,
      p_total_odds: totalOdds,
      p_bet_type:   betType,
      p_selections: selections,
    })

    if (error) {
      console.error('place_bet rpc error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error, new_odds: result.new_odds }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      bet_id: result.bet_id,
      potential_win: result.potential_win,
    })
  } catch (err) {
    console.error('Bet placement error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page   = parseInt(searchParams.get('page') || '1')
    const limit  = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    let query = supabase
      .from('bets')
      .select(`
        *,
        selections:bet_selections(
          *,
          match:matches(home_team, away_team, scheduled_at, status)
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data: bets, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ bets, total: count, page, limit })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
