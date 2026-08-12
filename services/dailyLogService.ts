"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { serialize } from '@/lib/serialize';

export async function getSnapshot(bankId: string, date: string) {
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const deposits = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { bankId, type: 'deposit', createdAt: { gte: startOfDay, lte: endOfDay } }
  });

  const withdrawals = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { bankId, type: 'withdrawal', createdAt: { gte: startOfDay, lte: endOfDay } }
  });

  const cashIns = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { bankId, type: 'cash_in', createdAt: { gte: startOfDay, lte: endOfDay } }
  });

  const expenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { bankId, createdAt: { gte: startOfDay, lte: endOfDay } }
  });

  const handCash = await prisma.handCashAccount.findUnique({
    where: { bankId }
  });

  return {
    total_deposits: Number(deposits._sum.amount || 0),
    total_withdrawals: Number(withdrawals._sum.amount || 0),
    total_cash_in: Number(cashIns._sum.amount || 0),
    total_expenses: Number(expenses._sum.amount || 0),
    total_commissions: 0,
    closing_hand_cash: Number(handCash?.balance || 0),
  };
}

export async function generateLog(bankId: string, userId: string) {
  const { userId: authUserId } = await auth();
  if (!authUserId) throw new Error("Unauthorized");

  const today = new Date().toISOString().split('T')[0];
  const snapshot = await getSnapshot(bankId, today);

  const logDate = new Date(today);

  const log = await prisma.dailyLog.upsert({
    where: {
      bankId_logDate: {
        bankId,
        logDate
      }
    },
    create: {
      bankId,
      logDate,
      totalDeposits: snapshot.total_deposits,
      totalWithdrawals: snapshot.total_withdrawals,
      totalCashIn: snapshot.total_cash_in,
      totalExpenses: snapshot.total_expenses,
      totalCommissions: snapshot.total_commissions,
      closingHandCash: snapshot.closing_hand_cash,
      generatedById: userId
    },
    update: {
      totalDeposits: snapshot.total_deposits,
      totalWithdrawals: snapshot.total_withdrawals,
      totalCashIn: snapshot.total_cash_in,
      totalExpenses: snapshot.total_expenses,
      totalCommissions: snapshot.total_commissions,
      closingHandCash: snapshot.closing_hand_cash,
      generatedById: userId
    }
  });

  return serialize(log);
}

export async function getByDateRange(bankId: string, startDate: string, endDate: string) {
  const data = await prisma.dailyLog.findMany({
    where: {
      bankId,
      logDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    orderBy: { logDate: 'asc' }
  });
  return serialize(data);
}

export async function getLatestLogs(bankId: string, limit: number = 30) {
  const data = await prisma.dailyLog.findMany({
    where: { bankId },
    orderBy: { logDate: 'desc' },
    take: limit
  });
  return serialize(data);
}
