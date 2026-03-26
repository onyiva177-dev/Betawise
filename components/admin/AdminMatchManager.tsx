'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminResultSetter } from './AdminResultSetter'

interface Match {
  id: string
  home_team: string
  away_team?: string
  status: string
  scheduled_at: string
  sport?: { name: string; icon: string } | null
}

export function AdminMatchManager({ matches }: { matches: Match[] }) {
  const router = useRouter()
  const [showCreate, setShowCreate]   = useState(false)
  const [settlingMatch, setSettlingMatch] = useState<{ id: string; name: string } | null>(null)
  const [creating, setCreating]       = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('upcoming')
  const [form, setForm] = useState({
    sport_id: '', home_team: '', away_team: '', scheduled_at: '', description: '',
    home_odds: '2.00', draw_odds: '3.40', away_odds: '2.80',
    over_odds: '1.85', under_odds: '1.95', btts_yes: '1.70', btts_no: '2.00',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const markets = form.away_team
        ? [
            { name: '1X2', key: 'match_winner', odds: [
                { selection: 'home', label: form.home_team, decimal_odds: parseFloat(form.home_odds) },
                { selection: 'draw', label: 'Draw',         decimal_odds: parseFloat(form.draw_odds) },
                { selection: 'away', label: form.away_team, decimal_odds: parseFloat(form.away_odds) },
            ]},
            { name: 'Over / Under 2.5', key: 'over_under_2.5', odds: [
                { selection: 'over',  label: 'Over 2.5',  decimal_odds: parseFloat(form.over_odds) },
                { selection: 'under', label: 'Under 2.5', decimal_odds: parseFloat(form.under_odds) },
            ]},
            { name: 'Both Teams to Score', key: 'btts', odds: [
                { selection: 'yes', label: 'Yes', decimal_odds: parseFloat(form.btts_yes) },
                { selection: 'no',  label: 'No',  decimal_odds: parseFloat(form.btts_no) },
            ]},
          ]
        : [{ name: 'Winner', key: 'winner', odds: [
              { selection: 'home', label: form.home_team, decimal_odds: parseFloat(form.home_odds) },
          ]}]

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, markets }),
      })
      if (res.ok) { setShowCreate(false); router.refresh() }
    } finally { setCreating(false) }
  }

  const STATUS_COLOR: Record<string, string> = {
    upcoming: '#60a5fa', live: 'var(--accent-green)',
    finished: 'var(--text-muted)', cancelled: 'var(--accent-red)',
  }

  const filtered = statusFilter === 'all' ? matches : matches.filter(m => m.status === statusFilter)

  return (
    <>
      {settlingMatch && (
        <AdminResultSetter
          matchId={settlingMatch.id}
          matchName={settlingMatch.name}
          onClose={() => setSettlingMatch(null)}
        />
      )}

      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display font-bold text-xl text-primary">Match Management</h2>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
              {['upcoming', 'finished', 'all'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
                  style={statusFilter === s
                    ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                    : { background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}>
              + Create Match
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="panel p-6 mb-4 animate-slide-up">
            <h3 className="font-display font-bold text-lg text-primary mb-4">New Match / Event</h3>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { k: 'home_team',     label: 'Home Team / Athlete *', ph: 'Arsenal / Kipchoge', req: true },
                  { k: 'away_team',     label: 'Away Team (blank for solo)', ph: 'Chelsea' },
                  { k: 'description',   label: 'Description',           ph: 'EPL Round 38' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-xs text-secondary mb-1">{f.label}</label>
                    <input type="text" required={f.req} value={form[f.k as keyof typeof form]} onChange={set(f.k)}
                      placeholder={f.ph}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-primary outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-secondary mb-1">Date & Time *</label>
                  <input required type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-primary outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
                </div>
              </div>

              {form.away_team && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-secondary mb-2 uppercase tracking-wide font-semibold">1X2 Odds</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { k: 'home_odds', l: form.home_team || 'Home' },
                        { k: 'draw_odds', l: 'Draw' },
                        { k: 'away_odds', l: form.away_team || 'Away' },
                      ].map(f => (
                        <div key={f.k}>
                          <label className="block text-xs text-muted-custom mb-1 truncate">{f.l}</label>
                          <input type="number" step="0.01" min="1.01" value={form[f.k as keyof typeof form]} onChange={set(f.k)}
                            className="w-full px-3 py-2 rounded-lg text-sm text-gold font-bold text-center outline-none"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs text-secondary mb-2 uppercase tracking-wide font-semibold">Over/Under 2.5</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ k: 'over_odds', l: 'Over' }, { k: 'under_odds', l: 'Under' }].map(f => (
                          <div key={f.k}>
                            <label className="block text-xs text-muted-custom mb-1">{f.l}</label>
                            <input type="number" step="0.01" min="1.01" value={form[f.k as keyof typeof form]} onChange={set(f.k)}
                              className="w-full px-3 py-2 rounded-lg text-sm text-gold font-bold text-center outline-none"
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-secondary mb-2 uppercase tracking-wide font-semibold">Both Teams Score</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ k: 'btts_yes', l: 'Yes' }, { k: 'btts_no', l: 'No' }].map(f => (
                          <div key={f.k}>
                            <label className="block text-xs text-muted-custom mb-1">{f.l}</label>
                            <input type="number" step="0.01" min="1.01" value={form[f.k as keyof typeof form]} onChange={set(f.k)}
                              className="w-full px-3 py-2 rounded-lg text-sm text-gold font-bold text-center outline-none"
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={creating}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #f5c518, #e8a000)', color: '#07090f' }}>
                  {creating ? 'Creating...' : '✓ Create Match'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-6 py-2.5 rounded-lg text-sm text-secondary" style={{ background: 'var(--bg-elevated)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="panel overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-secondary text-sm">No {statusFilter} matches</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    {['Match', 'Sport', 'Scheduled', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-muted-custom uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-border)' }}
                        className="hover:bg-[#131929] transition-colors">
                      <td className="px-4 py-3 font-semibold text-primary">
                        {m.home_team}{m.away_team ? ` vs ${m.away_team}` : ''}
                      </td>
                      <td className="px-4 py-3 text-secondary">{m.sport?.icon} {m.sport?.name}</td>
                      <td className="px-4 py-3 text-secondary">
                        {new Date(m.scheduled_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                              style={{ background: `${STATUS_COLOR[m.status]}22`, color: STATUS_COLOR[m.status] }}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.status === 'upcoming' && (
                          <button
                            onClick={() => setSettlingMatch({ id: m.id, name: `${m.home_team}${m.away_team ? ` vs ${m.away_team}` : ''}` })}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{ background: 'rgba(0,214,143,0.1)', color: 'var(--accent-green)' }}>
                            Set Result
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
