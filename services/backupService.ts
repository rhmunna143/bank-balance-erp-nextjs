"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function createBackup(bankId: string, label: string, userId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  const data = await prisma.$queryRawUnsafe(`SELECT create_bank_backup($1, $2, $3)`, bankId, label, userId);
  return data;
}

export async function getBackups(bankId: string) {
  const data: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, bank_id, label, created_by, created_at FROM bank_backups WHERE bank_id = $1 ORDER BY created_at DESC`,
    bankId
  );
  return data || [];
}

export async function getBackupData(backupId: string) {
  const data: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM bank_backups WHERE id = $1 LIMIT 1`,
    backupId
  );
  return data?.[0] || null;
}

export async function restoreBackup(backupId: string, bankId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  const data = await prisma.$executeRawUnsafe(
    `SELECT restore_bank_backup($1, $2)`,
    backupId,
    bankId
  );
  return data;
}

export async function restoreFromFile(bankId: string, backupData: any) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  const label = `File restore - ${new Date().toLocaleString()}`;
  const insertRes: any[] = await prisma.$queryRawUnsafe(
    `INSERT INTO bank_backups (bank_id, label, backup_data, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    bankId,
    label,
    backupData,
    authData.userId
  );

  const insertedId = insertRes?.[0]?.id;
  if (!insertedId) throw new Error("Failed to insert backup");

  try {
    const data = await prisma.$executeRawUnsafe(
      `SELECT restore_bank_backup($1, $2)`,
      insertedId,
      bankId
    );
    return data;
  } finally {
    await prisma.$executeRawUnsafe(`DELETE FROM bank_backups WHERE id = $1`, insertedId);
  }
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
    data: backup.backup_data,
  };
  
  return exportData;
}

export async function downloadCurrentSnapshot(bankId: string, bankName: string, userId: string) {
  const label = `Offline backup - ${new Date().toLocaleString()}`;
  const result: any = await createBackup(bankId, label, userId);
  const backupId = result?.[0]?.create_bank_backup || result?.id;
  
  if (backupId) {
    return await downloadBackup(backupId, bankName);
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

  await prisma.$executeRawUnsafe(`DELETE FROM bank_backups WHERE id = $1`, backupId);
}

export async function resetAllData(bankId: string) {
  const authData = await auth();
  if (!authData.userId) throw new Error("Unauthorized");

  const data = await prisma.$executeRawUnsafe(`SELECT reset_bank_data($1)`, bankId);
  return data;
}
