'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DepositPage() {
  const router = useRouter()
  const [method, setMethod] = useState<'mpesa' | 'bank'>('mpesa')
  const [amount, setAmount] = useState('')
  const [phone, setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<'form' | 'pending' | 'success'>('form')
  const [message, setMessage] = useState('')

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          amount: parseFloat(amount),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error ?? 'Failed to initiate deposit')
        setLoading(false)
        return
      }

      setStep('pending')
      setMessage(data.message)
    } catch {
      setMessage('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (step === 'pending') {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="w-full max-w-sm panel p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
               style={{ background: 'rgba(0,214,143,0.1)', border: '2px solid var(--accent-green)' }}>
            📱
          </div>
          <h2 className="font-display font-bold text-2xl text-primary mb-2">Check Your Phone</h2>
          <p className="text-secondary text-sm mb-6">{message}</p>

          <div className="rounded-xl p-4 mb-6 text-left space-y-2" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-xs text-muted-custom uppercase tracking-wide">Payment Details</p>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Amount</span>
              <span className="text-primary font-semibold">KES {amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Phone</span>
              <span className="text-primary">{phone}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => { setStep('success'); router.refresh() }}
              className="w-full py-3 rounded-xl font-display font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
            >
              I've completed payment
            </button>
            <button
              onClick={() => { setStep('form'); setLoading(false) }}
              className="w-full py-3 text-sm text-secondary hover:text-primary"
            >
              ← Start over
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="w-full max-w-sm panel p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display font-bold text-2xl text-primary mb-2">Deposit Submitted</h2>
          <p className="text-secondary text-sm mb-6">
            Your balance will update once the M-Pesa payment is confirmed. This usually takes under 30 seconds.
          </p>
          <Link
            href="/account"
            className="block w-full py-3 rounded-xl font-display font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
          >
            Back to Account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base">
      <header
        className="sticky top-0 z-40 px-4 h-14 flex items-center gap-4"
        style={{ background: 'rgba(7,9,15,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--bg-border)' }}
      >
        <Link href="/account" className="text-secondary hover:text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className="font-display font-bold text-xl text-primary">Deposit Funds</span>
      </header>

      <main className="max-w-sm mx-auto px-4 py-6 space-y-6">
        {/* Method selector */}
        <div className="panel p-1 flex">
          {(['mpesa', 'bank'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={
                method === m
                  ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {m === 'mpesa' ? '🟢 M-Pesa' : '🏦 Bank'}
            </button>
          ))}
        </div>

        {method === 'mpesa' ? (
          <form onSubmit={handleDeposit} className="panel p-6 space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: 'rgba(0,214,143,0.08)', border: '1px solid rgba(0,214,143,0.15)' }}>
              <span className="text-2xl">📱</span>
              <div>
                <p className="text-sm font-semibold text-primary">Lipa na M-Pesa</p>
                <p className="text-xs text-secondary">Instant • Safaricom STK Push</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">M-Pesa Phone Number</label>
              <div className="flex gap-2">
                <div
                  className="flex items-center px-3 rounded-lg text-secondary text-sm shrink-0"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                >
                  🇰🇪 +254
                </div>
                <input
                  type="tel" required
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="7XXXXXXXX"
                  className="flex-1 px-4 py-3 rounded-lg text-primary outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">Amount (KES)</label>
              <input
                type="number" required min="10" max="150000"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-3 rounded-lg text-primary outline-none text-xl font-bold"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
              />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 2000].map(a => (
                  <button
                    key={a} type="button"
                    onClick={() => setAmount(String(a))}
                    className="flex-1 py-2 text-xs font-semibold rounded-md"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <p className="text-red-400 text-sm p-3 rounded-lg" style={{ background: 'rgba(255,77,77,0.1)' }}>
                {message}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-display font-bold text-xl disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
            >
              {loading ? 'Initiating...' : `DEPOSIT KES ${amount || '—'}`}
            </button>

            <p className="text-xs text-muted-custom text-center">
              Min: KES 10 · Max: KES 150,000 · Instant credit
            </p>
          </form>
        ) : (
          <div className="panel p-6 text-center">
            <div className="text-4xl mb-3">🏦</div>
            <h3 className="font-display font-bold text-lg text-primary mb-2">Bank Transfer</h3>
            <p className="text-secondary text-sm mb-4">Coming soon. Use M-Pesa for instant deposits.</p>
            <div className="text-left rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs text-muted-custom uppercase">Bank Details (placeholder)</p>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Bank</span><span className="text-primary">KCB Bank Kenya</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Account</span><span className="text-primary">1234567890</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Name</span><span className="text-primary">BetaWise Ltd</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
