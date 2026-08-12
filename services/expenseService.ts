"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { serialize } from '@/lib/serialize';

export async function getAllExpenses(bankId: string, filters: any = {}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let where: any = { bankId };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.deductFrom) where.deductFrom = filters.deductFrom;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const [data, count] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: { select: { name: true } },
        motherAccount: { select: { name: true, accountNumber: true } },
        profitAccount: { select: { name: true } },
        performedBy: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || undefined,
      skip: filters.offset || undefined
    }),
    prisma.expense.count({ where })
  ]);

  return { data: serialize(data), count };
}

export async function updateExpense(id: string, updates: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const data = await prisma.expense.update({
    where: { id },
    data: updates
  });
  return serialize(data);
}

export async function reverseExpense(_params: any) {
  throw new Error("reverseExpense not implemented yet in new schema.");
}
