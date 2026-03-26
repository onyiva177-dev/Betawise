'use client'
import Link from 'next/link'
import type { Sport } from '@/types'

interface SportsTabsProps {
  sports: Sport[]
  active: string
}

export function SportsTabs({ sports, active }: SportsTabsProps) {
  const tabs = [{ id: 'all', name: 'All Sports', slug: 'all', icon: '🎯' }, ...sports]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {tabs.map(tab => {
        const isActive = active === tab.slug
        return (
          <Link
            key={tab.slug}
            href={tab.slug === 'all' ? '/' : `/?sport=${tab.slug}`}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              isActive
                ? { background: 'var(--accent-gold)', color: '#07090f' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }
            }
          >
            <span>{tab.icon}</span>
            <span className="font-display font-semibold tracking-wide">{tab.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
