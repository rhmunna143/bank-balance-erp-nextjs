import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPaymentSession, updatePaymentSession } from '@/services/paymentService';
import { createStripeSession } from '@/services/gateways/stripeService';
import { createSSLCommerzSession } from '@/services/gateways/sslcommerzService';
import { createBkashSession } from '@/services/gateways/bkashService';
import { createUddoktaPaySession } from '@/services/gateways/uddoktapayService';

const PLAN_PRICES: Record<string, number> = {
  basic: 500,
  pro: 1000,
  enterprise: 5000,
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bankId, planId, gateway } = await req.json();

    if (!bankId || !planId || !gateway) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amount = PLAN_PRICES[planId] || 500;
    const currency = 'BDT';

    // 1. Create a pending payment session in DB
    const payment = await createPaymentSession(bankId, gateway, amount, currency, planId);
    let checkoutUrl = '';

    // 2. Delegate to specific gateway service
    switch (gateway) {
      case 'stripe':
        const stripeSession = await createStripeSession(payment.id, bankId, amount, currency, planId);
        checkoutUrl = stripeSession.url || '';
        await updatePaymentSession(payment.id, stripeSession.id);
        break;
      
      case 'sslcommerz':
        const sslSession = await createSSLCommerzSession(payment.id, bankId, amount, currency, planId);
        checkoutUrl = sslSession.GatewayPageURL;
        await updatePaymentSession(payment.id, sslSession.session_key);
        break;
      
      case 'bkash':
        const bkashSession = await createBkashSession(payment.id, bankId, amount, currency, planId);
        checkoutUrl = bkashSession.bkashURL;
        await updatePaymentSession(payment.id, bkashSession.paymentID);
        break;

      case 'uddoktapay':
        const uddoktaUrl = await createUddoktaPaySession(payment.id, bankId, amount, planId);
        checkoutUrl = uddoktaUrl;
        // Uddokta Pay might not return a distinct session ID, using URL as placeholder
        await updatePaymentSession(payment.id, payment.id); 
        break;

      default:
        return NextResponse.json({ error: "Unsupported gateway" }, { status: 400 });
    }

    if (!checkoutUrl) {
      throw new Error("Failed to get checkout URL from gateway");
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
