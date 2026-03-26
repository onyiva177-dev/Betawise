'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBetSlip } from '@/hooks/useBetSlip'

export function Header() {
  const [balance, setBalance] = useState<number | null>(null)
  const [user, setUser]       = useState<{ email?: string } | null>(null)
  const { selections, toggleSlip } = useBetSlip()

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUser(user)
      sb.from('wallets').select('balance').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setBalance(data.balance) })
    })
  }, [])

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(7,9,15,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e2640',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="font-display font-extrabold text-2xl text-primary shrink-0">
          BETA<span className="text-gold">WISE</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {[
            { href: '/', label: 'Home' },
            { href: '/?sport=football', label: '⚽ Football' },
            { href: '/?sport=rugby', label: '🏉 Rugby' },
            { href: '/?sport=athletics', label: '🏃 Athletics' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors rounded-md hover:bg-elevated"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Balance */}
              <Link
                href="/account"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)' }}
              >
                <span className="text-muted-custom text-xs">KES</span>
                <span className="text-gold font-semibold">
                  {balance !== null ? balance.toFixed(2) : '—'}
                </span>
              </Link>

              {/* Deposit */}
              <Link
                href="/account/deposit"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-primary"
                style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)' }}
              >
                + Deposit
              </Link>

              {/* Account */}
              <Link
                href="/account"
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-primary"
                style={{ background: '#1e2640' }}
              >
                {user.email?.[0].toUpperCase() ?? 'U'}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-primary gradient-gold"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Bet Slip button */}
          <button
            onClick={toggleSlip}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: '#131929', border: '1px solid #1e2640' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="11" y2="16" />
            </svg>
            <span className="hidden sm:inline text-secondary">Slip</span>
            {selections.length > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-primary"
                style={{ background: 'var(--accent-gold)' }}
              >
                {selections.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
