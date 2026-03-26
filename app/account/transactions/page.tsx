import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Transaction } from '@/types'

const TYPE_LABEL: Record<string, { label: string; emoji: string; positive: boolean }> = {
  deposit:          { label: 'Deposit',        emoji: '⬇️',  positive: true  },
  withdrawal:       { label: 'Withdrawal',     emoji: '⬆️',  positive: false },
  bet_placed:       { label: 'Bet Placed',     emoji: '🎯',  positive: false },
  bet_won:          { label: 'Bet Won',        emoji: '🏆',  positive: true  },
  bet_refund:       { label: 'Bet Refund',     emoji: '↩️',  positive: true  },
  bonus:            { label: 'Bonus',          emoji: '🎁',  positive: true  },
  admin_adjustment: { label: 'Adjustment',     emoji: '⚙️',  positive: true  },
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const page   = parseInt(params.page ?? '1')
  const limit  = 25
  const offset = (page - 1) * limit
  const type   = params.type

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type && type !== 'all') query = query.eq('type', type)

  const { data: transactions, count } = await query
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-40 px-4 h-14 flex items-center gap-4"
        style={{ background: 'rgba(7,9,15,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--bg-border)' }}
      >
        <Link href="/account" className="text-secondary hover:text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className="font-display font-bold text-xl text-primary">Transaction History</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all',        label: 'All' },
            { key: 'deposit',    label: '⬇️ Deposits' },
            { key: 'withdrawal', label: '⬆️ Withdrawals' },
            { key: 'bet_placed', label: '🎯 Bets' },
            { key: 'bet_won',    label: '🏆 Wins' },
          ].map(f => (
            <Link
              key={f.key}
              href={`/account/transactions${f.key !== 'all' ? `?type=${f.key}` : ''}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={
                (type === f.key) || (!type && f.key === 'all')
                  ? { background: 'var(--accent-gold)', color: '#07090f' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }
              }
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Transaction list */}
        {!transactions?.length ? (
          <div className="panel p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-secondary">No transactions found</p>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            {transactions.map((txn: Transaction, i: number) => {
              const meta       = TYPE_LABEL[txn.type] ?? { label: txn.type, emoji: '•', positive: true }
              const isLast     = i === transactions.length - 1
              const isPositive = txn.amount > 0

              return (
                <div
                  key={txn.id}
                  className="flex items-center gap-4 px-4 py-4"
                  style={{ borderBottom: isLast ? 'none' : '1px solid var(--bg-border)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    {meta.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-custom mt-0.5">
                      {new Date(txn.created_at).toLocaleString('en-KE', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {txn.description && (
                      <p className="text-xs text-secondary mt-0.5">{txn.description}</p>
                    )}
                    {txn.mpesa_reference && (
                      <p className="text-xs text-muted-custom font-mono">{txn.mpesa_reference}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className="font-display font-bold text-base"
                      style={{ color: isPositive ? 'var(--accent-green)' : 'var(--text-primary)' }}
                    >
                      {isPositive ? '+' : ''}KES {Math.abs(txn.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-custom mt-0.5">
                      Bal: {txn.balance_after.toFixed(2)}
                    </p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: txn.status === 'completed' ? 'rgba(0,214,143,0.1)' : 'rgba(245,197,24,0.1)',
                        color:      txn.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-gold)',
                      }}
                    >
                      {txn.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={`/account/transactions?${type ? `type=${type}&` : ''}page=${page - 1}`}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                ← Previous
              </Link>
            )}
            <span className="text-secondary text-sm">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link
                href={`/account/transactions?${type ? `type=${type}&` : ''}page=${page + 1}`}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
