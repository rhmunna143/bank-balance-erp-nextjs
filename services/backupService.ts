"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function createBackup(bankId: string, label: string, userId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  const bank = await prisma.bank.findUnique({ where: { id: bankId }});
  if (!bank) throw new Error("Bank not found");
  
  const [
    members,
    motherAccounts,
    handCashAccount,
    profitAccounts,
    transactions,
    expenseCategories,
    expenses,
    dailyLogs,
    alertConfigs,
    loans,
    loanReturns,
    joinRequests
  ] = await Promise.all([
    prisma.bankMember.findMany({ where: { bankId } }),
    prisma.motherAccount.findMany({ where: { bankId } }),
    prisma.handCashAccount.findFirst({ where: { bankId } }),
    prisma.profitAccount.findMany({ where: { bankId } }),
    prisma.transaction.findMany({ where: { bankId } }),
    prisma.expenseCategory.findMany({ where: { bankId } }),
    prisma.expense.findMany({ where: { bankId } }),
    prisma.dailyLog.findMany({ where: { bankId } }),
    prisma.alertConfig.findMany({ where: { bankId } }),
    prisma.loan.findMany({ where: { bankId } }),
    prisma.loanReturn.findMany({ where: { bankId } }),
    prisma.bankJoinRequest.findMany({ where: { bankId } })
  ]);
  
  const backupDataObj = {
    version: 1,
    timestamp: new Date().toISOString(),
    bank,
    members,
    motherAccounts,
    handCashAccount,
    profitAccounts,
    transactions,
    expenseCategories,
    expenses,
    dailyLogs,
    alertConfigs,
    loans,
    loanReturns,
    joinRequests
  };
  
  const backupData = JSON.stringify(backupDataObj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
  
  const backup = await prisma.bankBackup.create({
    data: {
      bankId,
      label,
      backupData,
      createdBy: userId,
    }
  });

  // Keep only the 3 most recent backups
  const allBackups = await prisma.bankBackup.findMany({
    where: { bankId },
    orderBy: { createdAt: 'desc' }
  });

  if (allBackups.length > 3) {
    const toDelete = allBackups.slice(3);
    await prisma.bankBackup.deleteMany({
      where: { id: { in: toDelete.map(b => b.id) } }
    });
  }
  
  return backup;
}

export async function getBackups(bankId: string) {
  const data = await prisma.bankBackup.findMany({
    where: { bankId },
    select: { id: true, bankId: true, label: true, createdBy: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  // Map Prisma fields to match expected frontend structure if needed
  return data.map(b => ({
    id: b.id,
    bank_id: b.bankId,
    label: b.label,
    created_by: b.createdBy,
    created_at: b.createdAt
  }));
}

export async function getBackupData(backupId: string) {
  const data = await prisma.bankBackup.findUnique({
    where: { id: backupId }
  });
  return data;
}

export async function restoreBackup(backupId: string, bankId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  const backup = await getBackupData(backupId);
  if (!backup) throw new Error("Backup not found");

  const data = JSON.parse(backup.backupData);
  await restoreFromFile(bankId, data);
  return { success: true };
}

export async function restoreFromFile(bankId: string, backupData: any) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  // Reset all current data
  await resetAllData(bankId);

  // Restore data from backup object
  await prisma.$transaction(async (tx) => {
    if (backupData.handCashAccount) {
      // Re-create hand cash account
      await tx.handCashAccount.deleteMany({ where: { bankId } }); // Clean default one
      await tx.handCashAccount.create({ data: backupData.handCashAccount });
    }

    if (backupData.motherAccounts?.length) {
      await tx.motherAccount.createMany({ data: backupData.motherAccounts });
    }
    if (backupData.profitAccounts?.length) {
      await tx.profitAccount.createMany({ data: backupData.profitAccounts });
    }
    if (backupData.expenseCategories?.length) {
      await tx.expenseCategory.createMany({ data: backupData.expenseCategories });
    }
    if (backupData.transactions?.length) {
      await tx.transaction.createMany({ data: backupData.transactions });
    }
    if (backupData.expenses?.length) {
      await tx.expense.createMany({ data: backupData.expenses });
    }
    if (backupData.dailyLogs?.length) {
      await tx.dailyLog.createMany({ data: backupData.dailyLogs });
    }
    if (backupData.loans?.length) {
      await tx.loan.createMany({ data: backupData.loans });
    }
    if (backupData.loanReturns?.length) {
      await tx.loanReturn.createMany({ data: backupData.loanReturns });
    }
    if (backupData.alertConfigs?.length) {
      await tx.alertConfig.createMany({ data: backupData.alertConfigs });
    }
  });

  return { success: true };
}

export async function downloadBackup(backupId: string, bankName: string) {
  const backup = await getBackupData(backupId);
  if (!backup) throw new Error("Backup not found");

  const exportData = {
    version: 1,
    app: 'AgentBank ERP',
    exported_at: new Date().toISOString(),
    bank_name: bankName,
    label: backup.label,
    data: JSON.parse(backup.backupData),
  };
  
  return exportData;
}

export async function downloadCurrentSnapshot(bankId: string, bankName: string, userId: string) {
  const label = `Offline backup - ${new Date().toLocaleString()}`;
  const backup = await createBackup(bankId, label, userId);
  
  if (backup && backup.id) {
    return await downloadBackup(backup.id, bankName);
  }
  throw new Error("Failed to create snapshot");
}

export async function parseBackupFile(fileContent: string) {
  const parsed = JSON.parse(fileContent);
  if (parsed.version && parsed.data) {
    return parsed.data;
  }
  if (parsed.bank && parsed.transactions) {
    return parsed;
  }
  throw new Error('Invalid backup file format');
}

export async function deleteBackup(backupId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  await prisma.bankBackup.delete({ where: { id: backupId } });
}

export async function resetAllData(bankId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { bankId } }),
    prisma.expense.deleteMany({ where: { bankId } }),
    prisma.expenseCategory.deleteMany({ where: { bankId } }),
    prisma.loanReturn.deleteMany({ where: { bankId } }),
    prisma.loan.deleteMany({ where: { bankId } }),
    prisma.dailyLog.deleteMany({ where: { bankId } }),
    prisma.motherAccount.deleteMany({ where: { bankId } }),
    prisma.profitAccount.deleteMany({ where: { bankId } }),
    prisma.alertConfig.deleteMany({ where: { bankId } }),
    prisma.handCashAccount.deleteMany({ where: { bankId } }),
    
    // Create empty hand cash account
    prisma.handCashAccount.create({ data: { bankId, balance: 0 } })
  ]);
  
  return { success: true };
}
