"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function createPaymentSession(bankId: string, gateway: string, amount: number, currency: string = "BDT", planId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Create a pending SaaSPayment record
  const payment = await prisma.saaSPayment.create({
    data: {
      bankId,
      gateway,
      amount,
      currency,
      status: "pending",
      planId
    }
  });

  return payment;
}

export async function updatePaymentSession(paymentId: string, sessionId: string, transactionId?: string) {
  return await prisma.saaSPayment.update({
    where: { id: paymentId },
    data: {
      sessionId,
      ...(transactionId && { transactionId })
    }
  });
}

export async function markPaymentSuccess(paymentId: string, transactionId?: string) {
  const payment = await prisma.saaSPayment.update({
    where: { id: paymentId },
    data: {
      status: "success",
      ...(transactionId && { transactionId })
    }
  });

  // Activate bank subscription
  await prisma.bank.update({
    where: { id: payment.bankId },
    data: {
      subscriptionStatus: "active",
      subscriptionPlan: payment.planId,
      subscriptionId: payment.id // link the latest successful payment
    }
  });

  return payment;
}

export async function markPaymentFailed(paymentId: string, transactionId?: string) {
  return await prisma.saaSPayment.update({
    where: { id: paymentId },
    data: {
      status: "failed",
      ...(transactionId && { transactionId })
    }
  });
}
