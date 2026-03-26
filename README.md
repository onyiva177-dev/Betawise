# BetaWise Sports Betting Platform

A production-ready, full-stack sports betting web application built for the Kenyan market.

**Stack:** Next.js 15 (App Router) · Supabase · TypeScript · TailwindCSS · Vercel

---

## Features

- **Pre-match betting** — Football, Rugby, Athletics
- **Bet types** — Singles and Accumulators (multi-legs)
- **Live bet slip** — Real-time odds calculation, persisted across sessions
- **M-Pesa integration** — Daraja STK Push deposits + callback handler
- **Wallet system** — Deposits, withdrawals, full transaction history
- **Admin dashboard** — Create matches/odds, set results, settle bets, manage users
- **Security** — Atomic bet placement (no race conditions), odds validation, RLS policies
- **Mobile-first** — PWA-ready, responsive design

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourname/betawise.git
cd betawise
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/schema.sql` in full
3. In **Authentication → Settings**:
   - Enable Email provider
   - Enable Phone (SMS) provider (Twilio or Africa's Talking)
4. Copy your project URL and keys

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Fill in all values
```

### 4. Run locally

```bash
npm run dev
# App: http://localhost:3000
# Admin: http://localhost:3000/admin (requires admin role)
```

### 5. Make yourself an admin

In Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'your@email.com';
```

---

## M-Pesa Setup

### Sandbox (testing)
1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app → get Consumer Key + Secret
3. Use shortcode `174379` and the sandbox passkey
4. Use [ngrok](https://ngrok.com) to expose localhost for callbacks:
   ```bash
   ngrok http 3000
   # Set MPESA_CALLBACK_URL=https://xxxx.ngrok.io
   ```

### Production
1. Apply for Daraja API production access
2. Complete business registration with Safaricom
3. Get live credentials and your actual PayBill/Till number
4. Update `MPESA_ENV=production`

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard:
# Project Settings → Environment Variables
# Add all variables from .env.local.example
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## Project Structure

```
betawise/
├── app/
│   ├── page.tsx                    # Home — match listings
│   ├── auth/
│   │   ├── login/page.tsx          # Email + Phone OTP login
│   │   └── register/page.tsx       # Registration
│   ├── account/
│   │   ├── page.tsx                # User dashboard
│   │   └── deposit/page.tsx        # M-Pesa deposit
│   ├── admin/page.tsx              # Admin panel
│   └── api/
│       ├── bets/route.ts           # Place bets + history
│       ├── matches/route.ts        # List + create matches
│       ├── wallet/route.ts         # Balance
│       ├── payments/
│       │   ├── deposit/route.ts    # STK Push initiation
│       │   ├── withdraw/route.ts   # Withdrawal requests
│       │   └── mpesa/callback/     # Daraja callback handler
│       └── admin/route.ts          # Admin stats + settlements
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Sticky nav with live balance
│   │   └── Providers.tsx           # React Query wrapper
│   ├── betting/
│   │   ├── MatchCard.tsx           # Match with collapsible markets
│   │   ├── BetSlipDrawer.tsx       # Slide-out bet slip
│   │   └── SportsTabs.tsx          # Sport filter tabs
│   └── admin/
│       ├── AdminMatchManager.tsx   # Create/settle matches
│       ├── AdminWithdrawals.tsx    # Approve withdrawals
│       └── AdminUserTable.tsx      # Manage users
├── lib/supabase/
│   ├── client.ts                   # Browser Supabase client
│   └── server.ts                   # Server + admin clients
├── services/
│   └── mpesa.ts                    # Daraja API service
├── hooks/
│   └── useBetSlip.ts               # Zustand bet slip store
├── types/index.ts                  # All TypeScript types
├── supabase/schema.sql             # Full DB schema
└── .env.local.example              # Environment template
```

---

## Database Architecture

### Core tables
| Table | Purpose |
|---|---|
| `profiles` | User data, role, KYC status |
| `wallets` | Balance, totals per user |
| `transactions` | Every money movement |
| `matches` | Events with status |
| `markets` | Bet types per match (1X2, O/U, etc.) |
| `odds` | Decimal odds per selection |
| `bets` | Placed bets with odds snapshot |
| `bet_selections` | Individual legs of each bet |
| `mpesa_transactions` | STK push records |
| `withdrawal_requests` | Admin-approved withdrawals |

### Key DB functions
- `place_bet()` — Atomic: validates balance, locks wallet, checks odds drift, creates bet
- `settle_bet()` — Settles bet, pays winner, handles voids
- Auto-trigger creates `profile` + `wallet` on signup

---

## Security Model

- **RLS** — All tables locked; users only see own data
- **Atomic betting** — PostgreSQL `FOR UPDATE` prevents race conditions
- **Odds drift protection** — Bets rejected if odds changed >5% since slip was built
- **Admin routes** — Role checked server-side on every request
- **M-Pesa callback** — Always returns HTTP 200 (Safaricom requirement); processes idempotently
- **Fraud flags** — `fraud_flags` counter on profile, ready for automated rules

---

## Monetization

The platform makes money through the **margin built into odds** (house edge):

- Typical football 1X2 total implied probability: ~106% (6% margin)
- Track it via the `GGR` stat in admin: `Total Wagered − Total Paid Out`
- Target GGR margin: 5–8% across all markets

**Revenue streams to add:**
1. Odds adjustments on popular selections
2. Maximum win limits (already enforced: KES 1,000,000)
3. Minimum odds per accumulator leg
4. Withdrawal fees (small %)

---

## Extending the Platform

The architecture is designed for extension:

- **Live betting** — Add a `live_odds` table + WebSocket feed (Supabase Realtime)
- **More payment methods** — Add to `services/` + new API routes
- **Aviator/crash** — New game type with separate DB tables and settlement logic
- **Mobile app** — API-first design; wrap in React Native / Expo
- **Odds feed** — Plug in The Odds API or SportMonks for real odds data

---

## Compliance Notes (Kenya)

- Regulated by the **Betting Control and Licensing Board (BCLB)**
- Requires BCLB operator license before going live
- 7.5% Betting Tax applies on gross gaming revenue
- 20% withholding tax on winnings over KES 10,000
- KYC verification required before withdrawals (KYC system placeholder included)

---

## Support

Built for the Kenyan market with M-Pesa as the primary payment rail.
For issues, open a GitHub issue or contact the maintainer.

---

*18+ only · Gamble responsibly · BetaWise supports responsible gambling*
