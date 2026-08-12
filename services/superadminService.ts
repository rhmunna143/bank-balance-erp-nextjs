"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const superadminService = {
  async listAllBanks() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    return prisma.bank.findMany({
      include: {
        owner: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async setRootBank(bankId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    // Fallback using raw query if there's a stored procedure, 
    // or you can add the field to Prisma later.
    const data = await prisma.$executeRawUnsafe(`SELECT set_root_bank($1)`, bankId);
    return data;
  },

  async getRootBank() {
    const data: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM get_root_bank() LIMIT 1`);
    return data?.[0] || null;
  },

  async toggleBankActive(bankId: string, isActive: boolean) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    return prisma.bank.update({
      where: { id: bankId },
      data: { isActive }
    });
  },

  async getPlatformSettings() {
    const data: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM platform_settings LIMIT 1`);
    return data?.[0] || null;
  },

  async updatePlatformSettings(settings: any) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const data = await prisma.$executeRawUnsafe(`SELECT update_platform_settings($1)`, settings.platform_name || null);
    return data;
  },
};
