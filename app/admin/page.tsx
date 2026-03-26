import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminMatchManager } from '@/components/admin/AdminMatchManager'
import { AdminUserTable }    from '@/components/admin/AdminUserTable'
import { AdminWithdrawals }  from '@/components/admin/AdminWithdrawals'

export const revalidate = 0

// Local flat type that matches what AdminMatchManager expects
interface AdminMatch {
  id: string
  home_team: string
  away_team?: string
  status: string
  scheduled_at: string
  sport?: { name: string; icon: string } | null
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) redirect('/')

  const [betsRes, usersRes, matchesRes, withdrawalsRes] = await Promise.all([
    supabase.from('bets').select('stake, actual_win, status'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('matches')
      .select('id, home_team, away_team, status, scheduled_at, sport:sports(name, icon)')
      .order('scheduled_at', { ascending: false })
      .limit(50),
    supabase
      .from('withdrawal_requests')
      .select('*, user:profiles(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  // Supabase returns joined rows as arrays — flatten sport to object
  const matches: AdminMatch[] = (matchesRes.data ?? []).map(m => ({
    id:           m.id,
    home_team:    m.home_team,
    away_team:    m.away_team ?? undefined,
    status:       m.status,
    scheduled_at: m.scheduled_at,
    sport: Array.isArray(m.sport)
      ? (m.sport[0] ?? null)
      : (m.sport ?? null),
  }))

  const bets         = betsRes.data ?? []
  const totalWagered = bets.reduce((a, b) => a + (b.stake ?? 0), 0)
  const totalPayout  = bets.filter(b => b.status === 'won').reduce((a, b) => a + (b.actual_win ?? 0), 0)

  const stats = [
    { label: 'Total Users',      value: usersRes.count ?? 0,               color: '#60a5fa',             fmt: 'number' },
    { label: 'Total Bets',       value: bets.length,                        color: 'var(--accent-gold)',  fmt: 'number' },
    { label: 'Wagered',          value: totalWagered,                       color: 'var(--accent-green)', fmt: 'kes'    },
    { label: 'Paid Out',         value: totalPayout,                        color: '#a78bfa',             fmt: 'kes'    },
    { label: 'GGR',              value: totalWagered - totalPayout,         color: 'var(--accent-gold)',  fmt: 'kes'    },
    { label: 'Pending Withdraw', value: withdrawalsRes.data?.length ?? 0,   color: 'var(--accent-red)',   fmt: 'number' },
    { label: 'Active Matches',   value: matches.filter(m => m.status === 'upcoming').length,
                                                                             color: 'var(--text-primary)', fmt: 'number' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-40 px-6 h-14 flex items-center justify-between"
        style={{ background: 'rgba(7,9,15,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--bg-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-extrabold text-2xl text-primary">BETA<span className="text-gold">WISE</span></span>
          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-custom hidden sm:block">{user.email}</span>
          <a href="/" className="text-sm text-secondary hover:text-primary">← View Site</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary mb-4">Dashboard</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {stats.map(s => (
              <div key={s.label} className="panel p-4">
                <p className="text-xs text-muted-custom mb-1">{s.label}</p>
                <p className="font-display font-bold text-lg" style={{ color: s.color }}>
                  {s.fmt === 'kes'
                    ? `KES ${Number(s.value).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
                    : Number(s.value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <AdminMatchManager matches={matches} />
        <AdminWithdrawals withdrawals={(withdrawalsRes.data ?? []).map(w => ({
          ...w,
          user: Array.isArray(w.user) ? (w.user[0] ?? null) : (w.user ?? null),
        }))} />
        <AdminUserTable />
      </main>
    </div>
  )
}
