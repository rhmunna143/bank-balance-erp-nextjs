"use server";

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: '2023-10-16' as any,
});

export async function createStripeSession(
  paymentId: string, 
  bankId: string, 
  amount: number, 
  currency: string,
  planId: string
) {
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Subscription Plan: ${planId.toUpperCase()}`,
            description: `Payment for AgentBank ERP subscription (${planId})`,
          },
          unit_amount: Math.round(amount * 100), // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      paymentId,
      bankId,
      planId,
    },
  });

  return session;
}
