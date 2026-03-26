import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseMpesaCallback } from '@/services/mpesa'

// M-Pesa posts to this URL after STK Push completes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('M-Pesa callback received:', JSON.stringify(body))

    const supabase = await createAdminClient()
    const callback = parseMpesaCallback(body)

    if (!callback) {
      console.error('Could not parse M-Pesa callback')
      // Always return 200 to M-Pesa or they'll retry
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // Find the mpesa_transaction record
    const { data: mpesaTxn } = await supabase
      .from('mpesa_transactions')
      .select('*, transaction:transactions(*)')
      .eq('checkout_request_id', callback.checkoutRequestId)
      .single()

    if (!mpesaTxn) {
      console.error('M-Pesa transaction not found:', callback.checkoutRequestId)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // Idempotency: already processed?
    if (mpesaTxn.status === 'completed' || mpesaTxn.status === 'failed') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const isSuccess = callback.resultCode === 0

    // Update mpesa record
    await supabase
      .from('mpesa_transactions')
      .update({
        result_code:   callback.resultCode,
        result_desc:   callback.resultDesc,
        mpesa_receipt: callback.mpesaReceiptNumber,
        status:        isSuccess ? 'completed' : 'failed',
        raw_callback:  body,
      })
      .eq('id', mpesaTxn.id)

    if (isSuccess && mpesaTxn.direction === 'deposit') {
      // Credit wallet — admin client bypasses RLS
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', mpesaTxn.user_id)
        .single()

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            balance:         wallet.balance + mpesaTxn.amount,
            total_deposited: supabase.rpc('increment_field', { field: 'total_deposited', val: mpesaTxn.amount }),
          })
          .eq('user_id', mpesaTxn.user_id)

        // Update transaction status
        await supabase
          .from('transactions')
          .update({
            status:         'completed',
            balance_after:  wallet.balance + mpesaTxn.amount,
            mpesa_reference: callback.mpesaReceiptNumber,
          })
          .eq('id', mpesaTxn.transaction_id)
      }
    } else if (!isSuccess) {
      // Mark transaction as failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', mpesaTxn.transaction_id)
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (err) {
    console.error('M-Pesa callback error:', err)
    // Still return 200 — never return error to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
