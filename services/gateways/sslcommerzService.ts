"use server";

export async function createSSLCommerzSession(
  paymentId: string, 
  bankId: string, 
  amount: number, 
  currency: string,
  planId: string
) {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX === 'true';
  const baseUrl = isSandbox 
    ? 'https://sandbox.sslcommerz.com/gwprocess/v3/api.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v3/api.php';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const data = new URLSearchParams();
  data.append('store_id', storeId || "");
  data.append('store_passwd', storePass || "");
  data.append('total_amount', amount.toString());
  data.append('currency', currency);
  data.append('tran_id', paymentId);
  data.append('success_url', `${appUrl}/api/webhooks/sslcommerz?status=success`);
  data.append('fail_url', `${appUrl}/api/webhooks/sslcommerz?status=fail`);
  data.append('cancel_url', `${appUrl}/api/webhooks/sslcommerz?status=cancel`);
  data.append('emi_option', '0');
  data.append('cus_name', `Bank Owner - ${bankId}`);
  data.append('cus_email', 'owner@example.com');
  data.append('cus_phone', '01700000000');
  data.append('cus_add1', 'Dhaka');
  data.append('cus_city', 'Dhaka');
  data.append('cus_country', 'Bangladesh');
  data.append('shipping_method', 'NO');
  data.append('product_name', `Subscription Plan: ${planId}`);
  data.append('product_category', 'Subscription');
  data.append('product_profile', 'non-physical-goods');
  
  data.append('value_a', paymentId);
  data.append('value_b', bankId);
  data.append('value_c', planId);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: data,
  });

  const result = await response.json();
  
  if (result.status === 'SUCCESS') {
    return {
      GatewayPageURL: result.GatewayPageURL,
      session_key: result.sessionkey
    };
  } else {
    throw new Error(result.failedreason || "Failed to initiate SSLCommerz session");
  }
}
