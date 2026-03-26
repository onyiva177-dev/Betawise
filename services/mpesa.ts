/**
 * BetaWise M-Pesa Daraja API Integration
 * Supports STK Push (Lipa na M-Pesa Online)
 */

const DARAJA_BASE = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

const CONSUMER_KEY    = process.env.MPESA_CONSUMER_KEY!
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!
const SHORTCODE       = process.env.MPESA_SHORTCODE!
const PASSKEY         = process.env.MPESA_PASSKEY!
const CALLBACK_URL    = process.env.MPESA_CALLBACK_URL!

// -------------------------------------------------------
// Get OAuth token
// -------------------------------------------------------
export async function getMpesaToken(): Promise<string> {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to get M-Pesa token')
  const data = await res.json()
  return data.access_token
}

// -------------------------------------------------------
// Generate STK Push password
// -------------------------------------------------------
function getStkPassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')
  return { password, timestamp }
}

// -------------------------------------------------------
// Initiate STK Push (deposit)
// -------------------------------------------------------
export interface StkPushParams {
  phoneNumber: string  // 254XXXXXXXXX
  amount: number
  accountRef: string
  description: string
}

export interface StkPushResponse {
  success: boolean
  merchantRequestId?: string
  checkoutRequestId?: string
  responseCode?: string
  responseDescription?: string
  customerMessage?: string
  error?: string
}

export async function initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
  try {
    const token = await getMpesaToken()
    const { password, timestamp } = getStkPassword()

    // Sanitize phone number
    let phone = params.phoneNumber.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = `254${phone.slice(1)}`
    if (!phone.startsWith('254')) phone = `254${phone}`

    const body = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(params.amount),  // Must be integer
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: `${CALLBACK_URL}/api/payments/mpesa/callback`,
      AccountReference: params.accountRef.slice(0, 12),
      TransactionDesc: params.description.slice(0, 13),
    }

    const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (data.ResponseCode === '0') {
      return {
        success: true,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage,
      }
    }

    return { success: false, error: data.ResponseDescription || 'STK push failed' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// -------------------------------------------------------
// Query STK Push status
// -------------------------------------------------------
export async function queryStkPush(checkoutRequestId: string) {
  try {
    const token = await getMpesaToken()
    const { password, timestamp } = getStkPassword()

    const body = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }

    const res = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return await res.json()
  } catch {
    return null
  }
}

// -------------------------------------------------------
// Parse M-Pesa callback body
// -------------------------------------------------------
export interface MpesaCallbackData {
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  amount?: number
  mpesaReceiptNumber?: string
  phoneNumber?: string
  transactionDate?: string
}

export function parseMpesaCallback(body: Record<string, unknown>): MpesaCallbackData | null {
  try {
    const stk = (body?.Body as Record<string, unknown>)?.stkCallback as Record<string, unknown>
    if (!stk) return null

    const metadata = stk.CallbackMetadata as Record<string, unknown>
    const items: Array<{ Name: string; Value: unknown }> = (metadata?.Item as Array<{ Name: string; Value: unknown }>) || []

    const get = (name: string) => items.find(i => i.Name === name)?.Value

    return {
      merchantRequestId: stk.MerchantRequestID as string,
      checkoutRequestId: stk.CheckoutRequestID as string,
      resultCode: stk.ResultCode as number,
      resultDesc: stk.ResultDesc as string,
      amount: get('Amount') as number | undefined,
      mpesaReceiptNumber: get('MpesaReceiptNumber') as string | undefined,
      phoneNumber: get('PhoneNumber') as string | undefined,
      transactionDate: get('TransactionDate') as string | undefined,
    }
  } catch {
    return null
  }
}
