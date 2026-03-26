import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [usersRes, betsRes, matchesRes, withdrawalsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('bets').select('stake, actual_win, status'),
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'upcoming'),
    supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const bets         = betsRes.data ?? []
  const totalWagered = bets.reduce((a, b) => a + (b.stake ?? 0), 0)
  const totalPayout  = bets.filter(b => b.status === 'won').reduce((a, b) => a + (b.actual_win ?? 0), 0)

  return NextResponse.json({
    total_users:         usersRes.count ?? 0,
    total_bets:          bets.length,
    total_wagered:       totalWagered,
    total_payout:        totalPayout,
    ggr:                 totalWagered - totalPayout,
    active_matches:      matchesRes.count ?? 0,
    pending_withdrawals: withdrawalsRes.count ?? 0,
  })
}
