"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { serialize } from "@/lib/serialize";

export async function getHandCash(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const handCash = await prisma.handCashAccount.findUnique({
    where: { bankId },
  });
  return serialize(handCash);
}

export async function updateHandCashBalance(bankId: string, newBalance: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const handCash = await prisma.handCashAccount.update({
    where: { bankId },
    data: { balance: newBalance },
  });
  return serialize(handCash);
}

export async function updateHandCashThreshold(bankId: string, threshold: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const handCash = await prisma.handCashAccount.update({
    where: { bankId },
    data: { lowThreshold: threshold },
  });
  return serialize(handCash);
}
