import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateStkPush } from '@/services/mpesa'

const MIN_DEPOSIT = 10
const MAX_DEPOSIT = 150000

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phone_number, amount } = await req.json()

    if (!phone_number) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    if (!amount || amount < MIN_DEPOSIT) {
      return NextResponse.json({ error: `Minimum deposit is KES ${MIN_DEPOSIT}` }, { status: 400 })
    }
    if (amount > MAX_DEPOSIT) {
      return NextResponse.json({ error: `Maximum deposit is KES ${MAX_DEPOSIT}` }, { status: 400 })
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    // Create pending transaction
    const { data: wallet_current } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({
        user_id:        user.id,
        wallet_id:      wallet.id,
        type:           'deposit',
        amount:         amount,
        balance_before: wallet_current?.balance ?? 0,
        balance_after:  (wallet_current?.balance ?? 0) + amount,
        status:         'pending',
        payment_method: 'mpesa',
        description:    'M-Pesa deposit',
      })
      .select()
      .single()

    if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 })

    // Initiate STK push
    const stkResult = await initiateStkPush({
      phoneNumber: phone_number,
      amount,
      accountRef: `BW${user.id.slice(0, 6).toUpperCase()}`,
      description: 'BetaWise Deposit',
    })

    if (!stkResult.success) {
      // Mark transaction failed
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
      return NextResponse.json({ error: stkResult.error }, { status: 502 })
    }

    // Save M-Pesa transaction record
    await supabase.from('mpesa_transactions').insert({
      transaction_id:     txn.id,
      user_id:            user.id,
      merchant_request_id: stkResult.merchantRequestId,
      checkout_request_id: stkResult.checkoutRequestId,
      phone_number,
      amount,
      direction: 'deposit',
      status: 'pending',
    })

    return NextResponse.json({
      success: true,
      message: `Check your phone (${phone_number}) to complete payment`,
      checkout_request_id: stkResult.checkoutRequestId,
      transaction_id: txn.id,
    })
  } catch (err) {
    console.error('Deposit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
