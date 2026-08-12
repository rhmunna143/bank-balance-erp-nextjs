"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { serialize } from "@/lib/serialize";

export async function getMotherAccounts(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const accounts = await prisma.motherAccount.findMany({
    where: { bankId },
    orderBy: { createdAt: "asc" },
  });
  return serialize(accounts);
}

export async function getActiveMotherAccounts(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const accounts = await prisma.motherAccount.findMany({
    where: { bankId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return serialize(accounts);
}

export async function createMotherAccount(data: Prisma.MotherAccountUncheckedCreateInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await prisma.motherAccount.create({ data });
  return serialize(account);
}

export async function updateMotherAccount(id: string, updates: Prisma.MotherAccountUpdateInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await prisma.motherAccount.update({
    where: { id },
    data: updates,
  });
  return serialize(account);
}

export async function updateMotherAccountBalance(id: string, newBalance: number) {
  return updateMotherAccount(id, { balance: newBalance });
}

export async function toggleMotherAccountActive(id: string, isActive: boolean) {
  return updateMotherAccount(id, { isActive });
}
