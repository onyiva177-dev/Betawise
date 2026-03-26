export type UserRole = 'user' | 'admin' | 'super_admin'
export type KycStatus = 'pending' | 'submitted' | 'verified' | 'rejected'
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed'
export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'partially_won' | 'cashout'
export type BetType = 'single' | 'accumulator'
export type TransactionType = 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_refund' | 'bonus' | 'admin_adjustment'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type PaymentMethod = 'mpesa' | 'bank' | 'card' | 'internal'
export type SelectionResult = 'pending' | 'won' | 'lost' | 'void'
export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'

export interface Profile {
  id: string
  email?: string
  phone?: string
  full_name?: string
  username?: string
  avatar_url?: string
  role: UserRole
  kyc_status: KycStatus
  is_suspended: boolean
  fraud_flags: number
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  bonus_balance: number
  total_deposited: number
  total_withdrawn: number
  total_wagered: number
  total_won: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  type: TransactionType
  amount: number
  balance_before: number
  balance_after: number
  status: TransactionStatus
  payment_method?: PaymentMethod
  mpesa_reference?: string
  external_ref?: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Sport {
  id: string
  name: string
  slug: string
  icon?: string
  is_active: boolean
  sort_order: number
}

export interface Competition {
  id: string
  sport_id: string
  name: string
  country?: string
  logo_url?: string
  is_active: boolean
}

export interface Match {
  id: string
  sport_id: string
  competition_id?: string
  home_team: string
  away_team?: string
  home_logo?: string
  away_logo?: string
  description?: string
  scheduled_at: string
  status: MatchStatus
  home_score?: number
  away_score?: number
  result_notes?: string
  betting_closed: boolean
  created_at: string
  updated_at: string
  sport?: Sport
  competition?: Competition
  markets?: Market[]
}

export interface Market {
  id: string
  match_id: string
  name: string
  market_key: string
  is_active: boolean
  is_settled: boolean
  odds?: Odds[]
}

export interface Odds {
  id: string
  market_id: string
  match_id: string
  selection: string
  label: string
  decimal_odds: number
  is_active: boolean
  result?: SelectionResult
  updated_at: string
}

export interface BetSelection {
  id?: string
  bet_id?: string
  match_id: string
  market_id: string
  odds_id: string
  selection: string
  label: string
  decimal_odds: number
  status?: SelectionResult
  match?: Match
}

export interface Bet {
  id: string
  user_id: string
  wallet_id: string
  bet_type: BetType
  total_odds: number
  stake: number
  potential_win: number
  actual_win?: number
  status: BetStatus
  odds_snapshot: BetSelection[]
  transaction_id?: string
  settled_at?: string
  created_at: string
  updated_at: string
  selections?: BetSelection[]
}

// Bet slip (client-side only)
export interface BetSlipSelection {
  match_id: string
  market_id: string
  odds_id: string
  selection: string
  label: string
  decimal_odds: number
  match_name: string
  market_name: string
  sport_slug: string
}

export interface BetSlip {
  selections: BetSlipSelection[]
  stake: number
  total_odds: number
  potential_win: number
}

export interface MpesaSTKRequest {
  phone_number: string
  amount: number
  account_ref: string
  description: string
}

export interface AdminStats {
  total_users: number
  total_bets: number
  total_wagered: number
  total_payout: number
  pending_withdrawals: number
  active_matches: number
  ggr: number // Gross Gaming Revenue
}
