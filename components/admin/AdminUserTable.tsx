'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserRow {
  id: string
  email?: string
  full_name?: string
  role: string
  kyc_status: string
  is_suspended: boolean
  created_at: string
  wallet: { balance: number } | null
}

export function AdminUserTable() {
  const [users, setUsers]     = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.from('profiles')
      .select('id, email, full_name, role, kyc_status, is_suspended, created_at, wallet:wallets(balance)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const rows = (data ?? []).map(u => ({
          ...u,
          wallet: Array.isArray(u.wallet) ? (u.wallet[0] ?? null) : (u.wallet ?? null),
        })) as UserRow[]
        setUsers(rows)
        setLoading(false)
      })
  }, [])

  async function toggleSuspend(userId: string, current: boolean) {
    const sb = createClient()
    await sb.from('profiles').update({ is_suspended: !current }).eq('id', userId)
    setUsers(u => u.map(x => x.id === userId ? { ...x, is_suspended: !current } : x))
  }

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl text-primary">Users</h2>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="px-3 py-2 rounded-lg text-sm text-primary outline-none w-48"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
        />
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-secondary text-sm">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  {['User', 'Balance', 'KYC', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-muted-custom uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}
                      style={{ borderBottom: '1px solid var(--bg-border)' }}
                      className={u.is_suspended ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{u.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-custom">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-gold">
                      KES {u.wallet?.balance?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize" style={{
                        color: u.kyc_status === 'verified' ? 'var(--accent-green)'
                             : u.kyc_status === 'rejected' ? 'var(--accent-red)'
                             : 'var(--accent-gold)',
                      }}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-muted-custom">
                      {new Date(u.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSuspend(u.id, u.is_suspended)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={u.is_suspended
                          ? { background: 'rgba(0,214,143,0.1)', color: 'var(--accent-green)' }
                          : { background: 'rgba(255,77,77,0.1)',  color: 'var(--accent-red)'   }}
                      >
                        {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
