import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const sport  = searchParams.get('sport')
    const status = searchParams.get('status') || 'upcoming'
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let query = supabase
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
      .eq('status', status)
      .eq('markets.is_active', true)
      .eq('markets.odds.is_active', true)
      .order('scheduled_at', { ascending: true })
      .limit(limit)

    if (sport) {
      query = query.eq('sports.slug', sport)
    }

    const { data: matches, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['admin','super_admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { home_team, away_team, sport_id, competition_id, scheduled_at, description, markets } = body

    if (!home_team || !sport_id || !scheduled_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        home_team, away_team, sport_id, competition_id,
        scheduled_at, description, created_by: user.id,
      })
      .select()
      .single()

    if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })

    // Create markets + odds if provided
    if (markets?.length) {
      for (const market of markets) {
        const { data: mkt } = await supabase
          .from('markets')
          .insert({ match_id: match.id, name: market.name, market_key: market.key })
          .select()
          .single()

        if (mkt && market.odds?.length) {
          await supabase.from('odds').insert(
            market.odds.map((o: { selection: string; label: string; decimal_odds: number }) => ({
              market_id: mkt.id,
              match_id: match.id,
              selection: o.selection,
              label: o.label,
              decimal_odds: o.decimal_odds,
            }))
          )
        }
      }
    }

    return NextResponse.json({ match }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
