'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function WithdrawPage() {
  const [balance, setBalance] = useState<number>(0)
  const [method, setMethod]   = useState<'mpesa' | 'bank'>('mpesa')
  const [amount, setAmount]   = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('wallets').select('balance').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setBalance(data.balance) })
      sb.from('profiles').select('phone').eq('id', user.id).single()
        .then(({ data }) => { if (data?.phone) setPhone(data.phone.replace('+254', '')) })
    })
  }, [])

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt < 100) { setMessage({ type: 'error', text: 'Minimum withdrawal is KES 100' }); return }
    if (amt > balance)     { setMessage({ type: 'error', text: 'Insufficient balance' }); return }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method,
          account_details: method === 'mpesa'
            ? { phone: phone.startsWith('0') ? `+254${phone.slice(1)}` : `+254${phone}` }
            : { note: 'Bank transfer' },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error }); return }
      setMessage({ type: 'success', text: data.message })
      setBalance(b => b - amt)
      setAmount('')
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

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
        <span className="font-display font-bold text-xl text-primary">Withdraw Funds</span>
      </header>

      <main className="max-w-sm mx-auto px-4 py-6 space-y-5">
        {/* Balance card */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0d1120, #131929)', border: '1px solid var(--bg-border)' }}
        >
          <div>
            <p className="text-xs text-muted-custom uppercase tracking-widest mb-1">Available Balance</p>
            <p className="font-display font-bold text-4xl text-gold">
              {balance.toFixed(2)}
            </p>
            <p className="text-xs text-secondary mt-0.5">KES</p>
          </div>
          <div className="text-4xl opacity-40">💰</div>
        </div>

        {/* Method tabs */}
        <div className="panel p-1 flex">
          {(['mpesa', 'bank'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={
                method === m
                  ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {m === 'mpesa' ? '🟢 M-Pesa' : '🏦 Bank'}
            </button>
          ))}
        </div>

        <form onSubmit={handleWithdraw} className="panel p-6 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">Amount (KES)</label>
            <input
              type="number" required min="100" max={balance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 rounded-lg text-primary outline-none text-xl font-bold"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
            />
            <div className="flex gap-2 mt-2">
              {[500, 1000, 2000, 5000].map(a => (
                <button
                  key={a} type="button"
                  onClick={() => setAmount(String(Math.min(a, balance)))}
                  disabled={balance < a}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-md disabled:opacity-30"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
                >
                  {a}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md"
                style={{ background: 'rgba(245,197,24,0.1)', color: 'var(--accent-gold)', border: '1px solid rgba(245,197,24,0.2)' }}
              >
                Max
              </button>
            </div>
          </div>

          {method === 'mpesa' ? (
            <div>
              <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">M-Pesa Number</label>
              <div className="flex gap-2">
                <div
                  className="flex items-center px-3 rounded-lg text-secondary text-sm shrink-0"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                >
                  🇰🇪 +254
                </div>
                <input
                  type="tel" required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="7XXXXXXXX"
                  className="flex-1 px-4 py-3 rounded-lg text-primary outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                />
              </div>
              <p className="text-xs text-muted-custom mt-1.5">
                Funds will be sent to this M-Pesa number within 24 hours after admin approval.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
            >
              <p className="text-sm text-secondary">Bank transfer requires manual processing.</p>
              <p className="text-xs text-muted-custom mt-1">Contact support to set up bank details.</p>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { label: 'Minimum withdrawal', value: 'KES 100' },
              { label: 'Processing time',    value: 'Within 24 hours' },
              { label: 'Withdrawal fee',     value: 'Free' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-muted-custom">{label}</span>
                <span className="text-secondary">{value}</span>
              </div>
            ))}
          </div>

          {message && (
            <div
              className="rounded-lg px-4 py-3 text-sm animate-slide-up"
              style={{
                background: message.type === 'success' ? 'rgba(0,214,143,0.1)' : 'rgba(255,77,77,0.1)',
                border: `1px solid ${message.type === 'success' ? 'rgba(0,214,143,0.3)' : 'rgba(255,77,77,0.3)'}`,
                color: message.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
              }}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit" disabled={loading || !amount || parseFloat(amount) > balance}
            className="w-full py-4 rounded-xl font-display font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
          >
            {loading ? 'Submitting...' : `WITHDRAW ${amount ? `KES ${parseFloat(amount).toLocaleString()}` : ''}`}
          </button>
        </form>
      </main>
    </div>
  )
}
