import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const MIN_WITHDRAWAL = 100

// POST: user requests withdrawal
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, method, account_details } = await req.json()

  if (!amount || amount < MIN_WITHDRAWAL) {
    return NextResponse.json({ error: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}` }, { status: 400 })
  }
  if (!method || !account_details) {
    return NextResponse.json({ error: 'Method and account details required' }, { status: 400 })
  }

  // Check balance (lock wallet)
  const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('user_id', user.id).single()
  if (!wallet || wallet.balance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Check for duplicate pending request
  const { data: existing } = await supabase
    .from('withdrawal_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending withdrawal request' }, { status: 409 })
  }

  // Deduct balance immediately + create pending request
  const { error: txnErr } = await supabase.rpc('create_withdrawal_request', {
    p_user_id:       user.id,
    p_wallet_id:     wallet.id,
    p_amount:        amount,
    p_method:        method,
    p_account_details: account_details,
  })

  if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Withdrawal request submitted. Processing within 24 hours.' })
}

// PATCH: admin approves/rejects
export async function PATCH(req: NextRequest) {
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin','super_admin'].includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, admin_note } = await req.json()
  if (!['approved','rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data: wr } = await adminSupabase
    .from('withdrawal_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (!wr) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  await adminSupabase
    .from('withdrawal_requests')
    .update({ status, admin_note, approved_by: user.id })
    .eq('id', id)

  // If rejected, refund balance
  if (status === 'rejected') {
    const { data: wallet } = await adminSupabase.from('wallets').select('balance').eq('user_id', wr.user_id).single()
    if (wallet) {
      await adminSupabase.from('wallets').update({ balance: wallet.balance + wr.amount }).eq('user_id', wr.user_id)
      await adminSupabase.from('transactions').insert({
        user_id:        wr.user_id,
        wallet_id:      wr.wallet_id,
        type:           'bet_refund',
        amount:         wr.amount,
        balance_before: wallet.balance,
        balance_after:  wallet.balance + wr.amount,
        status:         'completed',
        payment_method: 'internal',
        description:    'Withdrawal rejected - refund',
      })
    }
  }

  return NextResponse.json({ success: true })
}
