import { NextResponse } from 'next/server';
import { markPaymentSuccess, markPaymentFailed } from '@/services/paymentService';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('RT-UDDOKTAPAY-API-KEY');
    
    // Basic verification
    if (signature !== process.env.UDDOKTAPAY_API_KEY) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    const body = await req.json();

    const status = body.status;
    const paymentId = body.metadata?.paymentId;
    const transactionId = body.transaction_id;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing metadata.paymentId" }, { status: 400 });
    }

    if (status === 'COMPLETED') {
      await markPaymentSuccess(paymentId, transactionId);
    } else {
      await markPaymentFailed(paymentId, transactionId);
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Uddokta Pay Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
