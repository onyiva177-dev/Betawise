'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router  = useRouter()
  const [tab, setTab]         = useState<'email' | 'phone'>('email')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]         = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    let formatted = phone.replace(/\D/g, '')
    if (formatted.startsWith('0')) formatted = `+254${formatted.slice(1)}`
    else if (!formatted.startsWith('+')) formatted = `+254${formatted}`

    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    if (error) { setError(error.message); setLoading(false); return }
    setOtpSent(true); setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    let formatted = phone.replace(/\D/g, '')
    if (formatted.startsWith('0')) formatted = `+254${formatted.slice(1)}`
    else if (!formatted.startsWith('+')) formatted = `+254${formatted}`

    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-display font-extrabold text-4xl text-primary">
              BETA<span className="text-gold">WISE</span>
            </h1>
          </Link>
          <p className="text-secondary text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="panel p-6">
          {/* Tab switcher */}
          <div
            className="flex rounded-lg p-1 mb-6"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {(['email', 'phone'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setOtpSent(false) }}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize"
                style={
                  tab === t
                    ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {t === 'email' ? '📧 Email' : '📱 Phone OTP'}
              </button>
            ))}
          </div>

          {/* Email form */}
          {tab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg text-primary outline-none transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">Password</label>
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg text-primary outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-display font-bold text-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
              >
                {loading ? 'Signing in...' : 'SIGN IN'}
              </button>
            </form>
          )}

          {/* Phone OTP form */}
          {tab === 'phone' && !otpSent && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">Phone Number</label>
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
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-display font-bold text-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
              >
                {loading ? 'Sending...' : 'SEND OTP'}
              </button>
            </form>
          )}

          {tab === 'phone' && otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(0,214,143,0.08)' }}>
                <p className="text-green text-sm">OTP sent to {phone}</p>
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">Enter OTP</label>
                <input
                  type="text" required maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-lg text-primary outline-none text-center text-2xl tracking-widest font-bold"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-display font-bold text-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
              >
                {loading ? 'Verifying...' : 'VERIFY & LOGIN'}
              </button>
              <button type="button" onClick={() => setOtpSent(false)} className="w-full text-sm text-secondary hover:text-primary">
                ← Change number
              </button>
            </form>
          )}

          <p className="text-center text-sm text-secondary mt-6">
            No account?{' '}
            <Link href="/auth/register" className="text-gold hover:underline">Create one free</Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-custom mt-6">
          18+ only · Gambling can be addictive · Play responsibly
        </p>
      </div>
    </div>
  )
}
