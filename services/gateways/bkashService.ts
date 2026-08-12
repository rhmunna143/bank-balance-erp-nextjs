"use server";

async function getBkashToken(baseUrl: string, appKey: string, appSecret: string, username: string, password: string) {
  const response = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'username': username,
      'password': password,
    },
    body: JSON.stringify({
      app_key: appKey,
      app_secret: appSecret,
    }),
  });
  const data = await response.json();
  if (data.statusMessage !== 'Successful') {
    throw new Error(data.statusMessage || "Failed to get bKash token");
  }
  return data.id_token;
}

export async function createBkashSession(
  paymentId: string, 
  bankId: string, 
  amount: number, 
  currency: string = 'BDT',
  planId: string
) {
  const isSandbox = process.env.BKASH_IS_SANDBOX === 'true';
  const baseUrl = isSandbox 
    ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' 
    : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

  const appKey = process.env.BKASH_APP_KEY || "";
  const appSecret = process.env.BKASH_APP_SECRET || "";
  const username = process.env.BKASH_USERNAME || "";
  const password = process.env.BKASH_PASSWORD || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const idToken = await getBkashToken(baseUrl, appKey, appSecret, username, password);

  const createRes = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': idToken,
      'X-APP-Key': appKey,
    },
    body: JSON.stringify({
      mode: '0011',
      payerReference: bankId,
      callbackURL: `${appUrl}/api/webhooks/bkash`,
      amount: amount.toString(),
      currency: currency,
      intent: 'sale',
      merchantInvoiceNumber: paymentId,
    }),
  });

  const createData = await createRes.json();
  if (createData.statusCode !== '0000') {
    throw new Error(createData.statusMessage || "Failed to create bKash payment");
  }

  return {
    paymentID: createData.paymentID,
    bkashURL: createData.bkashURL,
  };
}
