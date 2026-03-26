import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  let query = supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, kyc_status, is_suspended, fraud_flags, created_at, wallet:wallets(balance, total_deposited, total_wagered)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, action, value } = await req.json()
  const adminSb = await createAdminClient()

  if (action === 'toggle_suspend') {
    await adminSb.from('profiles').update({ is_suspended: value }).eq('id', user_id)
  } else if (action === 'set_role') {
    if (!['user', 'admin'].includes(value))
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    await adminSb.from('profiles').update({ role: value }).eq('id', user_id)
  } else if (action === 'adjust_balance') {
    const { data: wallet } = await adminSb
      .from('wallets').select('id, balance').eq('user_id', user_id).single()
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    const newBalance = wallet.balance + parseFloat(value)
    if (newBalance < 0) return NextResponse.json({ error: 'Balance cannot go negative' }, { status: 400 })

    await adminSb.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)
    await adminSb.from('transactions').insert({
      user_id,
      wallet_id:      wallet.id,
      type:           'admin_adjustment',
      amount:         parseFloat(value),
      balance_before: wallet.balance,
      balance_after:  newBalance,
      status:         'completed',
      payment_method: 'internal',
      description:    `Admin balance adjustment by ${user.email}`,
    })
  }

  return NextResponse.json({ success: true })
}
