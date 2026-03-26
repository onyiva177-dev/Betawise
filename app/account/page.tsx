import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: wallet }, { data: bets }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('wallets').select('*').eq('user_id', user.id).single(),
    supabase.from('bets')
      .select('*, selections:bet_selections(*, match:matches(home_team, away_team))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const stats = {
    pending: bets?.filter(b => b.status === 'pending').length ?? 0,
    won:     bets?.filter(b => b.status === 'won').length ?? 0,
    lost:    bets?.filter(b => b.status === 'lost').length ?? 0,
  }

  return (
    <div className="min-h-screen bg-base">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Profile card */}
        <div className="panel p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-2xl text-primary"
              style={{ background: 'linear-gradient(135deg, #1e2640, #131929)' }}
            >
              {profile?.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">
                {profile?.full_name ?? 'Bettor'}
              </h1>
              <p className="text-secondary text-sm">{user.email ?? profile?.phone}</p>
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: 'rgba(245,197,24,0.15)', color: 'var(--accent-gold)' }}
              >
                KYC: {profile?.kyc_status}
              </span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-custom uppercase tracking-wide">Balance</p>
              <p className="font-display font-bold text-3xl text-gold">
                {wallet?.balance?.toFixed(2) ?? '0.00'}
              </p>
              <p className="text-xs text-secondary">KES</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/account/deposit"
            className="panel p-4 flex items-center gap-3 hover:border-[var(--accent-gold)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                 style={{ background: 'rgba(0,214,143,0.1)' }}>💳</div>
            <div>
              <p className="font-semibold text-primary text-sm">Deposit</p>
              <p className="text-xs text-secondary">M-Pesa / Bank</p>
            </div>
          </Link>
          <Link
            href="/account/withdraw"
            className="panel p-4 flex items-center gap-3 hover:border-[var(--bg-border)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                 style={{ background: 'rgba(59,130,246,0.1)' }}>🏦</div>
            <div>
              <p className="font-semibold text-primary text-sm">Withdraw</p>
              <p className="text-xs text-secondary">To M-Pesa</p>
            </div>
          </Link>
        </div>

        {/* Wallet stats */}
        <div className="panel p-5">
          <h2 className="font-display font-bold text-lg text-primary mb-4">Wallet Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Deposited', value: `KES ${wallet?.total_deposited?.toFixed(0) ?? 0}`, color: 'var(--accent-green)' },
              { label: 'Total Wagered',   value: `KES ${wallet?.total_wagered?.toFixed(0) ?? 0}`,   color: 'var(--accent-gold)' },
              { label: 'Total Won',       value: `KES ${wallet?.total_won?.toFixed(0) ?? 0}`,       color: 'var(--accent-gold)' },
              { label: 'Total Withdrawn', value: `KES ${wallet?.total_withdrawn?.toFixed(0) ?? 0}`, color: 'var(--accent-blue)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xs text-muted-custom mb-1">{s.label}</p>
                <p className="font-display font-bold text-base" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bet stats */}
        <div className="panel p-5">
          <h2 className="font-display font-bold text-lg text-primary mb-4">Bet Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pending', val: stats.pending, cls: 'badge-pending' },
              { label: 'Won',     val: stats.won,     cls: 'badge-won' },
              { label: 'Lost',    val: stats.lost,    cls: 'badge-lost' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
                <p className="font-display font-bold text-3xl text-primary">{s.val}</p>
                <span className={`${s.cls} text-xs px-2 py-0.5 rounded-full mt-1 inline-block`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bet history */}
        <div className="panel p-5">
          <h2 className="font-display font-bold text-lg text-primary mb-4">Recent Bets</h2>
          {!bets?.length ? (
            <p className="text-secondary text-sm text-center py-8">No bets placed yet</p>
          ) : (
            <div className="space-y-3">
              {bets.map(bet => (
                <div
                  key={bet.id}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${bet.status}`}
                        >
                          {bet.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-custom capitalize">{bet.bet_type}</span>
                        <span className="text-xs text-muted-custom">
                          {new Date(bet.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Selections */}
                      <div className="space-y-1">
                        {bet.selections?.map((sel: {id: string; label: string; match?: {home_team: string; away_team?: string}; decimal_odds: number; status: string}) => (
                          <div key={sel.id} className="flex items-center gap-2 text-sm">
                            <span className="text-secondary truncate">
                              {sel.match?.home_team}{sel.match?.away_team ? ` vs ${sel.match.away_team}` : ''}
                            </span>
                            <span className="text-primary font-medium shrink-0">→ {sel.label}</span>
                            <span className="text-gold font-bold shrink-0">{sel.decimal_odds}x</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-custom">Stake</p>
                      <p className="font-semibold text-primary">KES {bet.stake}</p>
                      <p className="text-xs text-muted-custom mt-1">
                        {bet.status === 'won' ? 'Won' : 'Potential'}
                      </p>
                      <p className={`font-display font-bold ${bet.status === 'won' ? 'text-green' : 'text-secondary'}`}>
                        KES {(bet.actual_win ?? bet.potential_win)?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
