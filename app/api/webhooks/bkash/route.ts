import { NextResponse } from 'next/server';
import { markPaymentSuccess, markPaymentFailed } from '@/services/paymentService';
import { redirect } from 'next/navigation';

async function executeBkashPayment(paymentID: string) {
  const isSandbox = process.env.BKASH_IS_SANDBOX === 'true';
  const baseUrl = isSandbox 
    ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' 
    : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
  
  const appKey = process.env.BKASH_APP_KEY || "";
  const appSecret = process.env.BKASH_APP_SECRET || "";
  const username = process.env.BKASH_USERNAME || "";
  const password = process.env.BKASH_PASSWORD || "";

  // 1. Get Token
  const tokenRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'username': username, 'password': password },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret })
  });
  const tokenData = await tokenRes.json();
  const idToken = tokenData.id_token;

  // 2. Execute Payment
  const executeRes = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': idToken,
      'X-APP-Key': appKey,
    },
    body: JSON.stringify({ paymentID })
  });

  return await executeRes.json();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentID = searchParams.get('paymentID');
    const status = searchParams.get('status');

    if (!paymentID) {
      redirect('/settings/billing?status=error');
    }

    if (status === 'success') {
      const executeData = await executeBkashPayment(paymentID);
      
      if (executeData && executeData.statusCode === '0000' && executeData.transactionStatus === 'Completed') {
        const trxID = executeData.trxID;
        const merchantInvoiceNumber = executeData.merchantInvoiceNumber; // This is our paymentId
        
        await markPaymentSuccess(merchantInvoiceNumber, trxID);
        redirect('/settings/billing?status=success');
      } else {
        // Find payment by session (paymentID) and mark failed if execution failed
        redirect('/settings/billing?status=failed');
      }
    } else {
      // User cancelled or failed
      redirect('/settings/billing?status=cancel');
    }
  } catch (error) {
    console.error("bKash Webhook Error:", error);
    redirect('/settings/billing?status=error');
  }
}
