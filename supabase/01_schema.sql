-- ============================================================
-- BetaWise Sports Betting Platform - Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  full_name     TEXT,
  username      TEXT UNIQUE,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  kyc_status    TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  fraud_flags   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WALLETS
-- ============================================================

CREATE TABLE public.wallets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance       NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  bonus_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (bonus_balance >= 0),
  total_deposited NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_wagered   NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_won       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id),
  type            TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refund', 'bonus', 'admin_adjustment')),
  amount          NUMERIC(15,2) NOT NULL,
  balance_before  NUMERIC(15,2) NOT NULL,
  balance_after   NUMERIC(15,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method  TEXT CHECK (payment_method IN ('mpesa', 'bank', 'card', 'internal')),
  mpesa_reference TEXT,
  external_ref    TEXT,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SPORTS & MATCHES
-- ============================================================

CREATE TABLE public.sports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.competitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id    UUID NOT NULL REFERENCES public.sports(id),
  name        TEXT NOT NULL,
  country     TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id        UUID NOT NULL REFERENCES public.sports(id),
  competition_id  UUID REFERENCES public.competitions(id),
  home_team       TEXT NOT NULL,
  away_team       TEXT,  -- NULL for athletics individual events
  home_logo       TEXT,
  away_logo       TEXT,
  description     TEXT,  -- For athletics: "100m Final"
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'cancelled', 'postponed')),
  home_score      INTEGER,
  away_score      INTEGER,
  result_notes    TEXT,
  betting_closed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ODDS & MARKETS
-- ============================================================

CREATE TABLE public.markets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,     -- "1X2", "Over/Under", "Time Trial"
  market_key  TEXT NOT NULL,     -- "match_winner", "over_under_2.5", "finish_under_10s"
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_settled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, market_key)
);

CREATE TABLE public.odds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id     UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  match_id      UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  selection     TEXT NOT NULL,   -- "home", "draw", "away", "over", "under", "yes", "no"
  label         TEXT NOT NULL,   -- "Arsenal", "Draw", "Chelsea", "Over 2.5"
  decimal_odds  NUMERIC(8,3) NOT NULL CHECK (decimal_odds >= 1.01),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  result        TEXT CHECK (result IN ('won', 'lost', 'void', 'push')),
  updated_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(market_id, selection)
);

-- ============================================================
-- BETS
-- ============================================================

CREATE TABLE public.bets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id),
  bet_type        TEXT NOT NULL CHECK (bet_type IN ('single', 'accumulator')),
  total_odds      NUMERIC(10,3) NOT NULL,
  stake           NUMERIC(10,2) NOT NULL CHECK (stake > 0),
  potential_win   NUMERIC(15,2) NOT NULL,
  actual_win      NUMERIC(15,2),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void', 'partially_won', 'cashout')),
  odds_snapshot   JSONB NOT NULL DEFAULT '{}',  -- Snapshot of odds at time of bet
  transaction_id  UUID REFERENCES public.transactions(id),
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bet_selections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id        UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  match_id      UUID NOT NULL REFERENCES public.matches(id),
  market_id     UUID NOT NULL REFERENCES public.markets(id),
  odds_id       UUID NOT NULL REFERENCES public.odds(id),
  selection     TEXT NOT NULL,
  label         TEXT NOT NULL,
  decimal_odds  NUMERIC(8,3) NOT NULL,  -- Locked at time of bet
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- M-PESA TRANSACTIONS
-- ============================================================

CREATE TABLE public.mpesa_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id      UUID REFERENCES public.transactions(id),
  user_id             UUID NOT NULL REFERENCES public.profiles(id),
  merchant_request_id TEXT,
  checkout_request_id TEXT UNIQUE,
  phone_number        TEXT NOT NULL,
  amount              NUMERIC(10,2) NOT NULL,
  mpesa_receipt       TEXT,
  result_code         INTEGER,
  result_desc         TEXT,
  direction           TEXT NOT NULL CHECK (direction IN ('deposit', 'withdrawal')),
  status              TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'completed', 'failed', 'cancelled', 'timeout')),
  raw_callback        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WITHDRAWAL REQUESTS
-- ============================================================

CREATE TABLE public.withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id),
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method          TEXT NOT NULL CHECK (method IN ('mpesa', 'bank')),
  account_details JSONB NOT NULL,  -- phone or bank details
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  admin_note      TEXT,
  approved_by     UUID REFERENCES public.profiles(id),
  transaction_id  UUID REFERENCES public.transactions(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_kyc ON public.profiles(kyc_status);
CREATE INDEX idx_wallets_user ON public.wallets(user_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_matches_sport ON public.matches(sport_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_at);
CREATE INDEX idx_odds_match ON public.odds(match_id);
CREATE INDEX idx_odds_market ON public.odds(market_id);
CREATE INDEX idx_bets_user ON public.bets(user_id);
CREATE INDEX idx_bets_status ON public.bets(status);
CREATE INDEX idx_bets_created ON public.bets(created_at DESC);
CREATE INDEX idx_bet_selections_bet ON public.bet_selections(bet_id);
CREATE INDEX idx_bet_selections_match ON public.bet_selections(match_id);
CREATE INDEX idx_mpesa_checkout ON public.mpesa_transactions(checkout_request_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- Wallets policies
CREATE POLICY "Users can read own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can read all wallets" ON public.wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- Transactions policies
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can read all transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- Bets policies
CREATE POLICY "Users can read own bets" ON public.bets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can read all bets" ON public.bets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- Bet selections
CREATE POLICY "Users can read own bet_selections" ON public.bet_selections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bets WHERE id = bet_id AND user_id = auth.uid())
);

-- Public read for matches/sports/odds
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sports" ON public.sports FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Anyone can read active competitions" ON public.competitions FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can read markets" ON public.markets FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can read odds" ON public.odds FOR SELECT USING (TRUE);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update wallet updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_bets_updated_at BEFORE UPDATE ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_odds_updated_at BEFORE UPDATE ON public.odds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Place bet atomically (prevents race conditions & double-bet)
CREATE OR REPLACE FUNCTION public.place_bet(
  p_user_id UUID,
  p_stake NUMERIC,
  p_total_odds NUMERIC,
  p_bet_type TEXT,
  p_selections JSONB  -- [{match_id, market_id, odds_id, selection, label, decimal_odds}]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet       public.wallets%ROWTYPE;
  v_bet_id       UUID;
  v_txn_id       UUID;
  v_potential    NUMERIC;
  v_sel          JSONB;
  v_current_odds NUMERIC;
BEGIN
  -- Lock wallet row
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  -- Check balance
  IF v_wallet.balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Validate odds haven't changed significantly (>5% tolerance)
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    SELECT decimal_odds INTO v_current_odds
    FROM public.odds
    WHERE id = (v_sel->>'odds_id')::UUID AND is_active = TRUE;

    IF v_current_odds IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Odds no longer available');
    END IF;

    IF ABS(v_current_odds - (v_sel->>'decimal_odds')::NUMERIC) / (v_sel->>'decimal_odds')::NUMERIC > 0.05 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Odds have changed', 'new_odds', v_current_odds);
    END IF;
  END LOOP;

  v_potential := ROUND(p_stake * p_total_odds, 2);

  -- Create transaction
  INSERT INTO public.transactions (user_id, wallet_id, type, amount, balance_before, balance_after, status, payment_method, description)
  VALUES (p_user_id, v_wallet.id, 'bet_placed', -p_stake, v_wallet.balance, v_wallet.balance - p_stake, 'completed', 'internal', 'Bet placement')
  RETURNING id INTO v_txn_id;

  -- Deduct from wallet
  UPDATE public.wallets
  SET balance = balance - p_stake,
      total_wagered = total_wagered + p_stake
  WHERE id = v_wallet.id;

  -- Create bet
  INSERT INTO public.bets (user_id, wallet_id, bet_type, total_odds, stake, potential_win, transaction_id, odds_snapshot)
  VALUES (p_user_id, v_wallet.id, p_bet_type, p_total_odds, p_stake, v_potential, v_txn_id, p_selections)
  RETURNING id INTO v_bet_id;

  -- Create selections
  INSERT INTO public.bet_selections (bet_id, match_id, market_id, odds_id, selection, label, decimal_odds)
  SELECT
    v_bet_id,
    (sel->>'match_id')::UUID,
    (sel->>'market_id')::UUID,
    (sel->>'odds_id')::UUID,
    sel->>'selection',
    sel->>'label',
    (sel->>'decimal_odds')::NUMERIC
  FROM jsonb_array_elements(p_selections) AS sel;

  RETURN jsonb_build_object('success', true, 'bet_id', v_bet_id, 'potential_win', v_potential);
END;
$$;

-- Settle bet
CREATE OR REPLACE FUNCTION public.settle_bet(p_bet_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bet          public.bets%ROWTYPE;
  v_sel          public.bet_selections%ROWTYPE;
  v_all_won      BOOLEAN := TRUE;
  v_any_lost     BOOLEAN := FALSE;
  v_any_void     BOOLEAN := FALSE;
  v_txn_id       UUID;
BEGIN
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet not found or already settled');
  END IF;

  -- Check each selection
  FOR v_sel IN SELECT * FROM public.bet_selections WHERE bet_id = p_bet_id
  LOOP
    IF v_sel.status = 'lost' THEN v_any_lost := TRUE; v_all_won := FALSE; END IF;
    IF v_sel.status = 'void' THEN v_any_void := TRUE; END IF;
    IF v_sel.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not all selections settled yet');
    END IF;
  END LOOP;

  IF v_any_lost THEN
    UPDATE public.bets SET status = 'lost', settled_at = NOW() WHERE id = p_bet_id;
    RETURN jsonb_build_object('success', true, 'result', 'lost');
  END IF;

  IF v_all_won THEN
    -- Pay out
    INSERT INTO public.transactions (user_id, wallet_id, type, amount, balance_before, balance_after, status, payment_method, description)
    SELECT p.id, w.id, 'bet_won', v_bet.potential_win, w.balance, w.balance + v_bet.potential_win, 'completed', 'internal', 'Bet win payout'
    FROM public.wallets w JOIN public.profiles p ON p.id = w.user_id WHERE p.id = v_bet.user_id
    RETURNING id INTO v_txn_id;

    UPDATE public.wallets SET balance = balance + v_bet.potential_win, total_won = total_won + v_bet.potential_win
    WHERE user_id = v_bet.user_id;

    UPDATE public.bets SET status = 'won', actual_win = potential_win, settled_at = NOW() WHERE id = p_bet_id;
    RETURN jsonb_build_object('success', true, 'result', 'won', 'payout', v_bet.potential_win);
  END IF;

  -- Void / refund case
  INSERT INTO public.transactions (user_id, wallet_id, type, amount, balance_before, balance_after, status, payment_method, description)
  SELECT p.id, w.id, 'bet_refund', v_bet.stake, w.balance, w.balance + v_bet.stake, 'completed', 'internal', 'Bet void refund'
  FROM public.wallets w JOIN public.profiles p ON p.id = w.user_id WHERE p.id = v_bet.user_id;

  UPDATE public.wallets SET balance = balance + v_bet.stake WHERE user_id = v_bet.user_id;
  UPDATE public.bets SET status = 'void', actual_win = v_bet.stake, settled_at = NOW() WHERE id = p_bet_id;
  RETURN jsonb_build_object('success', true, 'result', 'void');
END;
$$;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO public.sports (name, slug, icon, sort_order) VALUES
  ('Football', 'football', '⚽', 1),
  ('Rugby', 'rugby', '🏉', 2),
  ('Athletics', 'athletics', '🏃', 3);

INSERT INTO public.competitions (sport_id, name, country)
SELECT id, 'English Premier League', 'England' FROM public.sports WHERE slug = 'football'
UNION ALL
SELECT id, 'La Liga', 'Spain' FROM public.sports WHERE slug = 'football'
UNION ALL
SELECT id, 'Kenya Premier League', 'Kenya' FROM public.sports WHERE slug = 'football'
UNION ALL
SELECT id, 'World Rugby Championship', 'International' FROM public.sports WHERE slug = 'rugby'
UNION ALL
SELECT id, 'World Athletics Championship', 'International' FROM public.sports WHERE slug = 'athletics';
-- ============================================================
-- Additional DB functions — run after schema.sql
-- ============================================================

-- Atomic withdrawal request creation (deducts balance immediately)
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_user_id         UUID,
  p_wallet_id       UUID,
  p_amount          NUMERIC,
  p_method          TEXT,
  p_account_details JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_txn_id UUID;
  v_req_id UUID;
BEGIN
  -- Lock wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct balance
  UPDATE public.wallets
  SET balance          = balance - p_amount,
      total_withdrawn  = total_withdrawn + p_amount
  WHERE id = p_wallet_id;

  -- Create pending transaction
  INSERT INTO public.transactions (
    user_id, wallet_id, type, amount,
    balance_before, balance_after, status, payment_method, description
  ) VALUES (
    p_user_id, p_wallet_id, 'withdrawal', -p_amount,
    v_wallet.balance, v_wallet.balance - p_amount,
    'pending', p_method, 'Withdrawal request'
  ) RETURNING id INTO v_txn_id;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id, wallet_id, amount, method, account_details, transaction_id
  ) VALUES (
    p_user_id, p_wallet_id, p_amount, p_method, p_account_details, v_txn_id
  ) RETURNING id INTO v_req_id;

  RETURN jsonb_build_object('success', true, 'request_id', v_req_id);
END;
$$;

-- Admin withdrawals endpoint helper
CREATE OR REPLACE FUNCTION public.admin_withdrawals_endpoint(
  p_id       UUID,
  p_status   TEXT,
  p_admin_id UUID,
  p_note     TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wr   public.withdrawal_requests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
BEGIN
  SELECT * INTO v_wr FROM public.withdrawal_requests
  WHERE id = p_id AND status = 'pending' FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  UPDATE public.withdrawal_requests
  SET status = p_status, admin_note = p_note, approved_by = p_admin_id
  WHERE id = p_id;

  IF p_status = 'rejected' THEN
    -- Refund
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_wr.user_id;
    UPDATE public.wallets
    SET balance = balance + v_wr.amount
    WHERE user_id = v_wr.user_id;

    UPDATE public.transactions SET status = 'cancelled' WHERE id = v_wr.transaction_id;

    INSERT INTO public.transactions (
      user_id, wallet_id, type, amount, balance_before, balance_after,
      status, payment_method, description
    ) VALUES (
      v_wr.user_id, v_wr.wallet_id, 'bet_refund', v_wr.amount,
      v_wallet.balance, v_wallet.balance + v_wr.amount,
      'completed', 'internal', 'Withdrawal rejected — refund'
    );
  ELSIF p_status = 'approved' THEN
    UPDATE public.transactions SET status = 'completed' WHERE id = v_wr.transaction_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
