import { NextResponse, NextRequest } from 'next/server';
import { markPaymentSuccess, markPaymentFailed } from '@/services/paymentService';
import { redirect } from 'next/navigation';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const status = req.nextUrl.searchParams.get('status');
    const tran_id = formData.get('tran_id') as string;
    const val_id = formData.get('val_id') as string;
    
    // In a real production app, you should validate the val_id with SSLCommerz verification API here.
    
    if (!tran_id) {
      return NextResponse.json({ error: "Missing tran_id" }, { status: 400 });
    }

    if (status === 'success') {
      await markPaymentSuccess(tran_id, val_id || tran_id);
      redirect('/settings/billing?status=success');
    } else {
      await markPaymentFailed(tran_id, val_id || tran_id);
      redirect('/settings/billing?status=failed');
    }
  } catch (error) {
    console.error("SSLCommerz Webhook Error:", error);
    redirect('/settings/billing?status=error');
  }
}
