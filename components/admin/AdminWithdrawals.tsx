'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Withdrawal {
  id: string
  amount: number
  method: string
  account_details: Record<string, string>
  created_at: string
  user?: { full_name?: string; email?: string } | null
}

export function AdminWithdrawals({ withdrawals }: { withdrawals: Withdrawal[] }) {
  const router  = useRouter()
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleAction(id: string, action: 'approved' | 'rejected', note?: string) {
    setProcessing(id)
    try {
      await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action, admin_note: note }),
      })
      router.refresh()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <section>
      <h2 className="font-display font-bold text-xl text-primary mb-4">
        Pending Withdrawals
        {withdrawals.length > 0 && (
          <span className="ml-2 text-sm px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,77,77,0.15)', color: 'var(--accent-red)' }}>
            {withdrawals.length}
          </span>
        )}
      </h2>

      {withdrawals.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-secondary text-sm">No pending withdrawals</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  {['User', 'Amount', 'Method', 'Account', 'Requested', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-muted-custom uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{w.user?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-custom">{w.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-gold">
                      KES {w.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-secondary capitalize">{w.method}</td>
                    <td className="px-4 py-3 text-secondary">
                      {w.account_details?.phone ?? w.account_details?.account_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-custom">
                      {new Date(w.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          disabled={processing === w.id}
                          onClick={() => handleAction(w.id, 'approved')}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                          style={{ background: 'rgba(0,214,143,0.1)', color: 'var(--accent-green)' }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={processing === w.id}
                          onClick={() => handleAction(w.id, 'rejected', 'Rejected by admin')}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                          style={{ background: 'rgba(255,77,77,0.1)', color: 'var(--accent-red)' }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
