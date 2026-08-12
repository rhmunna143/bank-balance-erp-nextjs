"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { serialize } from '@/lib/serialize';

// NOTE: Prisma Accelerate does NOT support interactive $transaction.

export async function issueLoan(params: any) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (params.source_type === 'hand_cash') {
      await prisma.handCashAccount.update({
        where: { bankId: params.bank_id },
        data: { balance: { decrement: params.amount } }
      });
    } else if (params.source_type === 'mother_account' && params.source_account_id) {
      await prisma.motherAccount.update({
        where: { id: params.source_account_id },
        data: { balance: { decrement: params.amount } }
      });
    } else if (params.source_type === 'profit_account' && params.source_account_id) {
      await prisma.profitAccount.update({
        where: { id: params.source_account_id },
        data: { balance: { decrement: params.amount } }
      });
    }

    const loan = await prisma.loan.create({
      data: {
        bankId: params.bank_id,
        borrowerUserId: params.borrower_user_id,
        amount: params.amount,
        remainingAmount: params.amount,
        sourceType: params.source_type,
        sourceAccountId: params.source_account_id || null,
        dueDate: params.due_date ? new Date(params.due_date) : null,
        notes: params.notes || null,
        trnId: params.trn_id || null,
        issuedById: userId,
        createdAt: params.created_at ? new Date(params.created_at) : undefined,
      }
    });

    return serialize(loan);
  }

export async function returnLoan(params: any) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const loan = await prisma.loan.findUnique({ where: { id: params.loan_id } });
    if (!loan) throw new Error("Loan not found");

    if (params.destination_type === 'hand_cash') {
      await prisma.handCashAccount.update({
        where: { bankId: loan.bankId },
        data: { balance: { increment: params.amount } }
      });
    } else if (params.destination_type === 'mother_account' && params.destination_account_id) {
      await prisma.motherAccount.update({
        where: { id: params.destination_account_id },
        data: { balance: { increment: params.amount } }
      });
    } else if (params.destination_type === 'profit_account' && params.destination_account_id) {
      await prisma.profitAccount.update({
        where: { id: params.destination_account_id },
        data: { balance: { increment: params.amount } }
      });
    }

    const loanReturn = await prisma.loanReturn.create({
      data: {
        loanId: params.loan_id,
        bankId: loan.bankId,
        amount: params.amount,
        destinationType: params.destination_type,
        destinationAccountId: params.destination_account_id || null,
        notes: params.notes || null,
        trnId: params.trn_id || null,
        returnedById: userId,
        createdAt: params.created_at ? new Date(params.created_at) : undefined,
      }
    });

    const remaining = Number(loan.remainingAmount) - Number(params.amount);
    await prisma.loan.update({
      where: { id: params.loan_id },
      data: {
        remainingAmount: remaining,
        status: remaining <= 0 ? 'paid' : 'active'
      }
    });

    return serialize(loanReturn);
  }

export async function getAll(bankId: string, filters: any = {}) {
    const query: any = {
      where: { bankId },
      include: {
        borrower: { select: { id: true, fullName: true, email: true } },
        issuer: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    };

    if (filters.status) query.where.status = filters.status;
    if (filters.borrower_user_id) query.where.borrowerUserId = filters.borrower_user_id;
    if (filters.startDate) query.where.createdAt = { ...query.where.createdAt, gte: new Date(filters.startDate) };
    if (filters.endDate) query.where.createdAt = { ...query.where.createdAt, lte: new Date(filters.endDate) };

    if (filters.search) {
      query.where.OR = [
        { trnId: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        { borrower: { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { borrower: { email: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    if (filters.limit) query.take = filters.limit;
    if (filters.offset) query.skip = filters.offset;

    const [data, count] = await Promise.all([
      prisma.loan.findMany(query),
      prisma.loan.count({ where: query.where })
    ]);

    return { data: serialize(data), count };
  }

export async function getReturns(loanId: string) {
    const data = await prisma.loanReturn.findMany({
      where: { loanId },
      include: {
        returnedBy: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return serialize(data);
  }

export async function getReturnsByDateRange(bankId: string, startDate: string, endDate: string) {
    const returns = await prisma.loanReturn.findMany({
      where: {
        bankId,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      include: {
        returnedBy: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const motherIds = Array.from(new Set(returns.filter(r => r.destinationType === 'mother_account' && r.destinationAccountId).map(r => r.destinationAccountId)));
    const profitIds = Array.from(new Set(returns.filter(r => r.destinationType === 'profit_account' && r.destinationAccountId).map(r => r.destinationAccountId)));

    const mothers = motherIds.length > 0 ? await prisma.motherAccount.findMany({ where: { id: { in: motherIds as string[] } } }) : [];
    const profits = profitIds.length > 0 ? await prisma.profitAccount.findMany({ where: { id: { in: profitIds as string[] } } }) : [];

    const motherMap = Object.fromEntries(mothers.map(m => [m.id, m]));
    const profitMap = Object.fromEntries(profits.map(p => [p.id, p]));

    const enriched = returns.map(ret => {
      let destination_label = '-';
      if (ret.destinationType === 'hand_cash') {
        destination_label = 'Hand Cash';
      } else if (ret.destinationType === 'mother_account') {
        const ma = motherMap[ret.destinationAccountId || ''];
        destination_label = ma ? `${ma.name}${ma.accountNumber ? ` (${ma.accountNumber})` : ''}` : 'Mother Account';
      } else if (ret.destinationType === 'profit_account') {
        const pa = profitMap[ret.destinationAccountId || ''];
        destination_label = pa?.name || 'Profit Account';
      }
      return {
        ...ret,
        destination_label,
        amount: Number(ret.amount),
        returned_by_profile: (ret as any).returnedBy
      };
    });

    return serialize(enriched);
  }

export async function getById(loanId: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    return serialize(loan);
  }

export async function updateLoan(loanId: string, updates: any) {
    const loan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        dueDate: updates.due_date ? new Date(updates.due_date) : undefined,
        notes: updates.notes,
        trnId: updates.trn_id,
      }
    });
    return serialize(loan);
  }