"use server";

export async function createUddoktaPaySession(
  paymentId: string, 
  bankId: string, 
  amount: number,
  planId: string
) {
  const apiKey = process.env.UDDOKTAPAY_API_KEY || "";
  const baseUrl = process.env.UDDOKTAPAY_BASE_URL || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'RT-UDDOKTAPAY-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: `Bank Owner ${bankId}`,
      email: 'owner@example.com',
      amount: amount.toString(),
      metadata: {
        paymentId,
        bankId,
        planId
      },
      redirect_url: `${appUrl}/settings/billing?status=success`,
      return_type: 'GET',
      cancel_url: `${appUrl}/settings/billing?status=cancel`,
      webhook_url: `${appUrl}/api/webhooks/uddoktapay`
    })
  });

  const data = await response.json();

  if (data.status) {
    return data.payment_url;
  } else {
    throw new Error(data.message || "Failed to initiate Uddokta Pay session");
  }
}
