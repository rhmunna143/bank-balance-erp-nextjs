"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { serialize } from '@/lib/serialize';

// NOTE: Prisma Accelerate does NOT support interactive $transaction.
// All operations below are sequential.

export async function processDeposit(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Increase hand cash
  await prisma.handCashAccount.update({
    where: { bankId: params.bank_id },
    data: { balance: { increment: params.amount } }
  });

  // Decrease mother account
  await prisma.motherAccount.update({
    where: { id: params.mother_account_id },
    data: { balance: { decrement: params.amount } }
  });

  let profitAccountId = null;
  if (params.commission > 0) {
    const profitAccounts = await prisma.profitAccount.findMany({
      where: { bankId: params.bank_id },
      take: 1
    });
    if (profitAccounts.length > 0) {
      profitAccountId = profitAccounts[0].id;
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { increment: params.commission } }
      });
    }
  }

  const txn = await prisma.transaction.create({
    data: {
      bankId: params.bank_id,
      type: 'deposit',
      amount: params.amount,
      commission: params.commission || 0,
      customerName: params.customer_name,
      customerAccount: params.customer_account || null,
      motherAccountId: params.mother_account_id,
      profitAccountId: profitAccountId,
      reference: params.reference || null,
      notes: params.notes || null,
      performedById: userId,
    }
  });

  return serialize(txn);
}

export async function processWithdrawal(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.handCashAccount.update({
    where: { bankId: params.bank_id },
    data: { balance: { decrement: params.amount } }
  });

  await prisma.motherAccount.update({
    where: { id: params.mother_account_id },
    data: { balance: { increment: params.amount } }
  });

  let profitAccountId = null;
  if (params.commission > 0) {
    const profitAccounts = await prisma.profitAccount.findMany({
      where: { bankId: params.bank_id },
      take: 1
    });
    if (profitAccounts.length > 0) {
      profitAccountId = profitAccounts[0].id;
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { increment: params.commission } }
      });
    }
  }

  const txn = await prisma.transaction.create({
    data: {
      bankId: params.bank_id,
      type: 'withdrawal',
      amount: params.amount,
      commission: params.commission || 0,
      customerName: params.customer_name,
      customerAccount: params.customer_account || null,
      motherAccountId: params.mother_account_id,
      profitAccountId: profitAccountId,
      reference: params.reference || null,
      notes: params.notes || null,
      performedById: userId,
    }
  });

  return serialize(txn);
}

export async function processWithdrawalWithShortage(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const amountToDecreaseFromHandCash = Number(params.amount) - Number(params.shortage_amount || 0);

  await prisma.handCashAccount.update({
    where: { bankId: params.bank_id },
    data: { balance: { decrement: amountToDecreaseFromHandCash } }
  });

  await prisma.motherAccount.update({
    where: { id: params.mother_account_id },
    data: { balance: { decrement: params.shortage_amount || 0 } }
  });

  let profitAccountId = null;
  if (params.commission > 0) {
    const profitAccounts = await prisma.profitAccount.findMany({
      where: { bankId: params.bank_id },
      take: 1
    });
    if (profitAccounts.length > 0) {
      profitAccountId = profitAccounts[0].id;
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { increment: params.commission } }
      });
    }
  }

  const txn = await prisma.transaction.create({
    data: {
      bankId: params.bank_id,
      type: 'withdrawal',
      amount: params.amount,
      commission: params.commission || 0,
      customerName: params.customer_name,
      customerAccount: params.customer_account || null,
      motherAccountId: params.mother_account_id,
      profitAccountId: profitAccountId,
      reference: params.reference || null,
      notes: params.notes || null,
      hasShortage: true,
      shortageAmount: params.shortage_amount || 0,
      performedById: userId,
    }
  });

  return serialize(txn);
}

export async function processCashIn(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (params.target_type === 'hand_cash') {
    await prisma.handCashAccount.update({
      where: { bankId: params.bank_id },
      data: { balance: { increment: params.amount } }
    });
  } else if (params.target_type === 'mother_account' && params.target_id) {
    await prisma.motherAccount.update({
      where: { id: params.target_id },
      data: { balance: { increment: params.amount } }
    });
  } else if (params.target_type === 'profit_account' && params.target_id) {
    await prisma.profitAccount.update({
      where: { id: params.target_id },
      data: { balance: { increment: params.amount } }
    });
  }

  // If source is Hand Cash, we deduct from it
  if (params.source === 'Hand Cash' && params.target_type !== 'hand_cash') {
    await prisma.handCashAccount.update({
      where: { bankId: params.bank_id },
      data: { balance: { decrement: params.amount } }
    });
  }

  const txn = await prisma.transaction.create({
    data: {
      bankId: params.bank_id,
      type: 'cash_in',
      amount: params.amount,
      source: params.source || null,
      motherAccountId: params.target_type === 'mother_account' ? params.target_id : null,
      profitAccountId: params.target_type === 'profit_account' ? params.target_id : null,
      reference: params.reference || null,
      notes: params.notes || null,
      performedById: userId,
    }
  });

  return serialize(txn);
}

export async function processExpense(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (params.deduct_from === 'hand_cash') {
    await prisma.handCashAccount.update({
      where: { bankId: params.bank_id },
      data: { balance: { decrement: params.amount } }
    });
  } else if (params.deduct_from === 'profit_account' && params.profit_account_id) {
    await prisma.profitAccount.update({
      where: { id: params.profit_account_id },
      data: { balance: { decrement: params.amount } }
    });
  } else if (params.deduct_from === 'mother_account' && params.mother_account_id) {
    await prisma.motherAccount.update({
      where: { id: params.mother_account_id },
      data: { balance: { decrement: params.amount } }
    });
  }

  const expense = await prisma.expense.create({
    data: {
      bankId: params.bank_id,
      amount: params.amount,
      categoryId: params.category_id,
      deductFrom: params.deduct_from,
      profitAccountId: params.profit_account_id || null,
      motherAccountId: params.mother_account_id || null,
      description: params.description || null,
      receiptUrl: params.receipt_url || null,
      performedById: userId,
    }
  });

  return serialize(expense);
}

export async function processFundTransfer(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Decrease balance from source
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

  // Increase balance in destination
  if (params.destination_type === 'hand_cash') {
    await prisma.handCashAccount.update({
      where: { bankId: params.bank_id },
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

  let motherAccountId = null;
  let profitAccountId = null;
  let reference = `Transfer from ${params.source_type} to ${params.destination_type}`;
  let customerName = params.destination_name || null;
  let customerAccount = params.destination_account || null;

  if (params.source_type === 'mother_account') {
    motherAccountId = params.source_account_id;
  } else if (params.destination_type === 'mother_account') {
    motherAccountId = params.destination_account_id;
  }

  if (params.source_type === 'profit_account') {
    profitAccountId = params.source_account_id;
  } else if (params.destination_type === 'profit_account') {
    profitAccountId = params.destination_account_id;
  }

  if (params.source_type === 'mother_account' && params.destination_type === 'mother_account') {
    customerAccount = params.destination_account_id;
  }

  const txn = await prisma.transaction.create({
    data: {
      bankId: params.bank_id,
      type: 'fund_transfer',
      amount: params.amount,
      source: params.source_type,
      customerName: customerName,
      customerAccount: customerAccount,
      motherAccountId: motherAccountId,
      profitAccountId: profitAccountId,
      reference: reference,
      notes: params.notes || null,
      performedById: userId,
      createdAt: params.created_at ? new Date(params.created_at) : undefined,
    }
  });

  return serialize(txn);
}

export async function reverseTransaction(params: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const txn = await prisma.transaction.findUnique({
    where: { id: params.txn_id }
  });
  if (!txn) throw new Error("Transaction not found");

  const { type, amount, commission, motherAccountId, profitAccountId, bankId, hasShortage, shortageAmount, source, reference, customerAccount } = txn;

  if (type === 'deposit') {
    await prisma.handCashAccount.update({
      where: { bankId },
      data: { balance: { decrement: amount } }
    });
    if (motherAccountId) {
      await prisma.motherAccount.update({
        where: { id: motherAccountId },
        data: { balance: { increment: amount } }
      });
    }
    if (commission && commission.toNumber() > 0 && profitAccountId) {
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { decrement: commission } }
      });
    }
  } else if (type === 'withdrawal') {
    if (hasShortage) {
      const amountToRevertToHandCash = amount.toNumber() - shortageAmount.toNumber();
      await prisma.handCashAccount.update({
        where: { bankId },
        data: { balance: { increment: amountToRevertToHandCash } }
      });
      if (motherAccountId) {
        await prisma.motherAccount.update({
          where: { id: motherAccountId },
          data: { balance: { increment: shortageAmount } }
        });
      }
    } else {
      await prisma.handCashAccount.update({
        where: { bankId },
        data: { balance: { increment: amount } }
      });
      if (motherAccountId) {
        await prisma.motherAccount.update({
          where: { id: motherAccountId },
          data: { balance: { decrement: amount } }
        });
      }
    }
    if (commission && commission.toNumber() > 0 && profitAccountId) {
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { decrement: commission } }
      });
    }
  } else if (type === 'cash_in') {
    if (motherAccountId) {
      await prisma.motherAccount.update({
        where: { id: motherAccountId },
        data: { balance: { decrement: amount } }
      });
    } else if (profitAccountId) {
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { decrement: amount } }
      });
    } else {
      await prisma.handCashAccount.update({
        where: { bankId },
        data: { balance: { decrement: amount } }
      });
    }
    if (source === 'Hand Cash') {
      await prisma.handCashAccount.update({
        where: { bankId },
        data: { balance: { increment: amount } }
      });
    }
  } else if (type === 'fund_transfer') {
    if (source === 'hand_cash') {
      await prisma.handCashAccount.update({
        where: { bankId },
        data: { balance: { increment: amount } }
      });
    } else if (source === 'mother_account' && motherAccountId) {
      await prisma.motherAccount.update({
        where: { id: motherAccountId },
        data: { balance: { increment: amount } }
      });
    } else if (source === 'profit_account' && profitAccountId) {
      await prisma.profitAccount.update({
        where: { id: profitAccountId },
        data: { balance: { increment: amount } }
      });
    }

    const destMatch = reference?.match(/to (\w+)$/);
    const destination_type = destMatch ? destMatch[1] : null;

    if (destination_type === 'hand_cash') {
      await prisma.handCashAccount.update({
        where: { bankId },
        data: { balance: { decrement: amount } }
      });
    } else if (destination_type === 'mother_account') {
      const targetId = (source === 'mother_account') ? customerAccount : motherAccountId;
      if (targetId) {
        await prisma.motherAccount.update({
          where: { id: targetId },
          data: { balance: { decrement: amount } }
        });
      }
    } else if (destination_type === 'profit_account') {
      const targetId = (source === 'profit_account') ? customerAccount : profitAccountId;
      if (targetId) {
        await prisma.profitAccount.update({
          where: { id: targetId },
          data: { balance: { decrement: amount } }
        });
      }
    }
  }

  // Record a reverse note or just delete the transaction
  await prisma.transaction.delete({
    where: { id: params.txn_id }
  });

  return { success: true };
}

export async function getTransactions(bankId: string, filters: any = {}) {
  const query: any = {
    where: { bankId },
    include: {
      motherAccount: { select: { name: true, accountNumber: true } },
      profitAccount: { select: { name: true } },
      performedBy: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
  };

  if (filters.type) query.where.type = filters.type;
  if (filters.limit) query.take = filters.limit;
  if (filters.offset) query.skip = filters.offset;

  const [data, count] = await Promise.all([
    prisma.transaction.findMany(query),
    prisma.transaction.count({ where: query.where })
  ]);

  return { data: serialize(data), count };
}

export async function getCashInTransactions(bankId: string, filters: any = {}) {
  const query: any = {
    where: { bankId, type: 'cash_in' },
    orderBy: { createdAt: 'desc' }
  };
  if (filters.limit) query.take = filters.limit;

  const data = await prisma.transaction.findMany(query);
  return serialize(data);
}

export async function getExpenses(bankId: string, filters: any = {}) {
  const query: any = {
    where: { bankId },
    include: {
      category: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  };
  if (filters.limit) query.take = filters.limit;
  if (filters.offset) query.skip = filters.offset;

  const data = await prisma.expense.findMany(query);
  return serialize(data);
}

export async function updateTransaction(id: string, updates: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const data = await prisma.transaction.update({
    where: { id },
    data: {
      customerName: updates.customer_name || undefined,
      customerAccount: updates.customer_account || undefined,
      amount: updates.amount != null ? parseFloat(updates.amount) : undefined,
      notes: updates.notes || undefined,
      source: updates.source || undefined,
    }
  });
  return serialize(data);
}

export async function getTodaySummary(bankId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [deposits, withdrawals, cashIns, expenses] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { bankId, type: 'deposit', createdAt: { gte: today } }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { bankId, type: 'withdrawal', createdAt: { gte: today } }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { bankId, type: 'cash_in', createdAt: { gte: today } }
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { bankId, createdAt: { gte: today } }
    })
  ]);

  return {
    totalDeposits: Number(deposits._sum.amount || 0),
    totalWithdrawals: Number(withdrawals._sum.amount || 0),
    totalCashIn: Number(cashIns._sum.amount || 0),
    totalExpenses: Number(expenses._sum.amount || 0)
  };
}
