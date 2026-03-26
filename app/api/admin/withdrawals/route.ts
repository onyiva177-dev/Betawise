import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, admin_note } = await req.json()

  const adminSb = await createAdminClient()
  const { data: result, error } = await adminSb.rpc('admin_withdrawals_endpoint', {
    p_id:       id,
    p_status:   status,
    p_admin_id: user.id,
    p_note:     admin_note ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!result?.success) return NextResponse.json({ error: result?.error }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*, user:profiles(full_name, email, phone)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ withdrawals: data })
}
