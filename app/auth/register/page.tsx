'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
  })
  const [agreed, setAgreed]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8)        { setError('Password must be at least 8 characters'); return }
    if (!agreed)                          { setError('You must agree to the terms'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: signUpErr } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone },
      },
    })

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-sm panel p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display font-bold text-2xl text-primary mb-2">Account Created!</h2>
          <p className="text-secondary text-sm mb-6">
            Check your email <strong className="text-primary">{form.email}</strong> for a confirmation link.
          </p>
          <Link
            href="/auth/login"
            className="block w-full py-3 rounded-xl font-display font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-display font-extrabold text-4xl text-primary">
              BETA<span className="text-gold">WISE</span>
            </h1>
          </Link>
          <p className="text-secondary text-sm mt-1">Create your account</p>
        </div>

        <div className="panel p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { key: 'full_name', label: 'Full Name',       type: 'text',     placeholder: 'John Otieno' },
              { key: 'email',     label: 'Email',           type: 'email',    placeholder: 'you@example.com' },
              { key: 'phone',     label: 'Phone (Safaricom)', type: 'tel',   placeholder: '0712345678' },
              { key: 'password',  label: 'Password',        type: 'password', placeholder: '••••••••' },
              { key: 'confirm',   label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-secondary mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input
                  type={f.type} required
                  value={form[f.key as keyof typeof form]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-3 rounded-lg text-primary outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                />
              </div>
            ))}

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded"
              />
              <span className="text-xs text-secondary leading-relaxed">
                I am 18+ years old and agree to the{' '}
                <a href="#" className="text-gold hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-gold hover:underline">Privacy Policy</a>
              </span>
            </label>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', color: 'var(--accent-red)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-display font-bold text-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}
            >
              {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <p className="text-center text-sm text-secondary mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
