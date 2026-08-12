"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { serialize } from "@/lib/serialize";

export async function getProfitAccounts(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const accounts = await prisma.profitAccount.findMany({
    where: { bankId },
    orderBy: { createdAt: "asc" },
  });
  return serialize(accounts);
}

export async function createProfitAccount(data: Prisma.ProfitAccountUncheckedCreateInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await prisma.profitAccount.create({ data });
  return serialize(account);
}

export async function updateProfitAccount(id: string, updates: Prisma.ProfitAccountUpdateInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await prisma.profitAccount.update({
    where: { id },
    data: updates,
  });
  return serialize(account);
}

export async function updateProfitAccountBalance(id: string, newBalance: number) {
  return updateProfitAccount(id, { balance: newBalance });
}
